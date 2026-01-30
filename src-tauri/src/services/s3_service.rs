use std::time::Duration;

use aws_credential_types::Credentials;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::Client as S3Client;
use futures::TryStreamExt;
use log::{debug, trace};
use opendal::services::S3;
use opendal::{Entry, Operator};

use crate::error::{AppError, AppResult};
use crate::models::{BucketInfo, BucketStats, ListObjectsResult, ObjectMetadata, S3ConnectionWithSecret, S3Object, S3Provider};
use std::collections::HashMap;

pub struct S3Service;

impl S3Service {
    pub fn create_operator(
        connection: &S3ConnectionWithSecret,
        bucket: &str,
    ) -> AppResult<Operator> {
        trace!(
            "Creating OpenDAL operator for bucket '{}' at {}",
            bucket,
            connection.endpoint
        );

        let mut builder = S3::default()
            .bucket(bucket)
            .endpoint(&connection.endpoint)
            .region(&connection.region)
            .access_key_id(&connection.access_key)
            .secret_access_key(&connection.secret_key);

        // Provider-specific configuration
        match connection.provider {
            S3Provider::CloudflareR2 => {
                debug!("Configuring for Cloudflare R2 (delete_max_size=700)");
                builder = builder.delete_max_size(700);
            }
            S3Provider::Minio => {
                if !connection.use_path_style {
                    debug!("Configuring MinIO with virtual host style");
                    builder = builder.enable_virtual_host_style();
                }
            }
            _ => {
                if !connection.use_path_style {
                    debug!("Using virtual host style addressing");
                    builder = builder.enable_virtual_host_style();
                }
            }
        }

        let op = Operator::new(builder)?.finish();

        Ok(op)
    }

    async fn create_s3_client(connection: &S3ConnectionWithSecret) -> S3Client {
        trace!(
            "Creating AWS SDK S3 client for endpoint: {}",
            connection.endpoint
        );

        let credentials = Credentials::new(
            &connection.access_key,
            &connection.secret_key,
            None,
            None,
            "baul-s3-client",
        );

        let mut config_builder = aws_sdk_s3::Config::builder()
            .credentials_provider(credentials)
            .region(Region::new(connection.region.clone()))
            .force_path_style(connection.use_path_style);

        // Set endpoint URL
        if !connection.endpoint.is_empty() {
            config_builder = config_builder.endpoint_url(&connection.endpoint);
        }

        let config = config_builder.build();
        S3Client::from_conf(config)
    }

    pub async fn list_buckets(connection: &S3ConnectionWithSecret) -> AppResult<Vec<BucketInfo>> {
        let client = Self::create_s3_client(connection).await;

        let result = client
            .list_buckets()
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        let buckets = result
            .buckets()
            .iter()
            .map(|b| BucketInfo {
                name: b.name().unwrap_or_default().to_string(),
                created_at: b.creation_date().map(|d| d.secs()),
                region: None,
            })
            .collect();

        Ok(buckets)
    }

    pub async fn list_objects(
        operator: &Operator,
        prefix: &str,
        max_keys: Option<u32>,
    ) -> AppResult<ListObjectsResult> {
        let mut objects = Vec::new();
        let mut prefixes = Vec::new();

        let prefix_with_delimiter = if prefix.is_empty() {
            "".to_string()
        } else if prefix.ends_with('/') {
            prefix.to_string()
        } else {
            format!("{}/", prefix)
        };

        // Default to 500 items per page, max 1000
        let limit = max_keys.unwrap_or(500).min(1000) as usize;
        let mut count = 0;

        let mut lister = operator.lister_with(&prefix_with_delimiter).await?;

        while let Some(entry) = lister.try_next().await? {
            if count >= limit {
                // We've reached the limit, indicate there's more data
                return Ok(ListObjectsResult {
                    objects,
                    prefixes,
                    continuation_token: Some(format!("offset:{}", count)),
                    is_truncated: true,
                });
            }

            let entry: Entry = entry;
            let path = entry.path().to_string();
            let meta = entry.metadata();

            if meta.is_dir() || path.ends_with('/') {
                // It's a directory/prefix
                prefixes.push(path);
            } else {
                // It's an object
                objects.push(S3Object {
                    key: path,
                    size: meta.content_length(),
                    last_modified: meta.last_modified().map(|t| t.timestamp()).unwrap_or(0),
                    etag: meta.etag().map(|s| s.to_string()),
                    content_type: meta.content_type().map(|s| s.to_string()),
                    is_directory: false,
                });
            }
            count += 1;
        }

        Ok(ListObjectsResult {
            objects,
            prefixes,
            continuation_token: None,
            is_truncated: false,
        })
    }

    /// List all objects without pagination (for operations that need full listing)
    pub async fn list_all_objects(
        operator: &Operator,
        prefix: &str,
    ) -> AppResult<ListObjectsResult> {
        let mut objects = Vec::new();
        let mut prefixes = Vec::new();

        let prefix_with_delimiter = if prefix.is_empty() {
            "".to_string()
        } else if prefix.ends_with('/') {
            prefix.to_string()
        } else {
            format!("{}/", prefix)
        };

        let mut lister = operator.lister_with(&prefix_with_delimiter).await?;

        while let Some(entry) = lister.try_next().await? {
            let entry: Entry = entry;
            let path = entry.path().to_string();
            let meta = entry.metadata();

            if meta.is_dir() || path.ends_with('/') {
                prefixes.push(path);
            } else {
                objects.push(S3Object {
                    key: path,
                    size: meta.content_length(),
                    last_modified: meta.last_modified().map(|t| t.timestamp()).unwrap_or(0),
                    etag: meta.etag().map(|s| s.to_string()),
                    content_type: meta.content_type().map(|s| s.to_string()),
                    is_directory: false,
                });
            }
        }

        Ok(ListObjectsResult {
            objects,
            prefixes,
            continuation_token: None,
            is_truncated: false,
        })
    }

    pub async fn upload_object(operator: &Operator, key: &str, data: Vec<u8>) -> AppResult<()> {
        operator.write(key, data).await?;
        Ok(())
    }

    pub async fn download_object(operator: &Operator, key: &str) -> AppResult<Vec<u8>> {
        let data = operator.read(key).await?;
        Ok(data.to_vec())
    }

    pub async fn delete_object(operator: &Operator, key: &str) -> AppResult<()> {
        operator.delete(key).await?;
        Ok(())
    }

    pub async fn get_object_details(operator: &Operator, key: &str) -> AppResult<S3Object> {
        let meta = operator.stat(key).await?;

        Ok(S3Object {
            key: key.to_string(),
            size: meta.content_length(),
            last_modified: meta.last_modified().map(|t| t.timestamp()).unwrap_or(0),
            etag: meta.etag().map(|s| s.to_string()),
            content_type: meta.content_type().map(|s| s.to_string()),
            is_directory: meta.is_dir(),
        })
    }

    pub async fn create_folder(operator: &Operator, path: &str) -> AppResult<()> {
        let folder_path = if path.ends_with('/') {
            path.to_string()
        } else {
            format!("{}/", path)
        };

        // Create an empty object with trailing slash to represent a folder
        operator.write(&folder_path, Vec::<u8>::new()).await?;
        Ok(())
    }

    pub async fn get_presigned_url(
        connection: &S3ConnectionWithSecret,
        bucket: &str,
        key: &str,
        expires_in_secs: u64,
    ) -> AppResult<String> {
        let client = Self::create_s3_client(connection).await;

        let presigning_config = PresigningConfig::builder()
            .expires_in(Duration::from_secs(expires_in_secs))
            .build()
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        let presigned_request = client
            .get_object()
            .bucket(bucket)
            .key(key)
            .presigned(presigning_config)
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        Ok(presigned_request.uri().to_string())
    }

    pub async fn get_object_content_as_text(
        operator: &Operator,
        key: &str,
        max_size: u64,
    ) -> AppResult<String> {
        let meta = operator.stat(key).await?;
        let size = meta.content_length();

        if size > max_size {
            return Err(AppError::S3Error(format!(
                "File too large for text preview: {} bytes (max: {} bytes)",
                size, max_size
            )));
        }

        let data = operator.read(key).await?;
        let text = String::from_utf8(data.to_vec())
            .map_err(|e| AppError::S3Error(format!("Not a valid UTF-8 text file: {}", e)))?;

        Ok(text)
    }

    // Bucket operations using AWS SDK
    pub async fn create_bucket(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
        region: Option<&str>,
    ) -> AppResult<()> {
        let client = Self::create_s3_client(connection).await;

        let region_str = region.unwrap_or(&connection.region);

        // For us-east-1, don't specify LocationConstraint
        let result = if region_str == "us-east-1" {
            client.create_bucket().bucket(bucket_name).send().await
        } else {
            use aws_sdk_s3::types::{BucketLocationConstraint, CreateBucketConfiguration};

            let constraint = BucketLocationConstraint::from(region_str);
            let cfg = CreateBucketConfiguration::builder()
                .location_constraint(constraint)
                .build();

            client
                .create_bucket()
                .bucket(bucket_name)
                .create_bucket_configuration(cfg)
                .send()
                .await
        };

        result.map_err(|e| AppError::S3Error(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_bucket(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
    ) -> AppResult<()> {
        let client = Self::create_s3_client(connection).await;

        client
            .delete_bucket()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        Ok(())
    }

    pub async fn get_bucket_location(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
    ) -> AppResult<Option<String>> {
        let client = Self::create_s3_client(connection).await;

        let result = client
            .get_bucket_location()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        Ok(result.location_constraint().map(|l| l.as_str().to_string()))
    }

    pub async fn copy_object(
        connection: &S3ConnectionWithSecret,
        source_bucket: &str,
        source_key: &str,
        dest_bucket: &str,
        dest_key: &str,
    ) -> AppResult<()> {
        let client = Self::create_s3_client(connection).await;

        let copy_source = format!("{}/{}", source_bucket, source_key);

        client
            .copy_object()
            .copy_source(&copy_source)
            .bucket(dest_bucket)
            .key(dest_key)
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        Ok(())
    }

    pub async fn rename_object(
        connection: &S3ConnectionWithSecret,
        bucket: &str,
        old_key: &str,
        new_key: &str,
    ) -> AppResult<()> {
        // Copy to new location, then delete old
        Self::copy_object(connection, bucket, old_key, bucket, new_key).await?;

        let operator = Self::create_operator(connection, bucket)?;
        Self::delete_object(&operator, old_key).await?;

        Ok(())
    }

    pub async fn head_bucket(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
    ) -> AppResult<bool> {
        let client = Self::create_s3_client(connection).await;

        match client.head_bucket().bucket(bucket_name).send().await {
            Ok(_) => Ok(true),
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("404") || err_str.contains("NotFound") {
                    Ok(false)
                } else {
                    Err(AppError::S3Error(err_str))
                }
            }
        }
    }

    pub async fn get_bucket_versioning(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
    ) -> AppResult<Option<String>> {
        let client = Self::create_s3_client(connection).await;

        let result = client
            .get_bucket_versioning()
            .bucket(bucket_name)
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        Ok(result.status().map(|s| s.as_str().to_string()))
    }

    pub async fn get_bucket_stats(
        connection: &S3ConnectionWithSecret,
        bucket_name: &str,
    ) -> AppResult<BucketStats> {
        let client = Self::create_s3_client(connection).await;

        let mut object_count: u64 = 0;
        let mut total_size: u64 = 0;
        let mut continuation_token: Option<String> = None;

        loop {
            let mut request = client.list_objects_v2().bucket(bucket_name);

            if let Some(token) = continuation_token.take() {
                request = request.continuation_token(token);
            }

            let result = request
                .send()
                .await
                .map_err(|e| AppError::S3Error(e.to_string()))?;

            for object in result.contents() {
                object_count += 1;
                total_size += object.size().unwrap_or(0) as u64;
            }

            if result.is_truncated() == Some(true) {
                continuation_token = result.next_continuation_token().map(|s| s.to_string());
            } else {
                break;
            }
        }

        Ok(BucketStats {
            name: bucket_name.to_string(),
            object_count,
            total_size,
        })
    }

    pub async fn get_object_metadata(
        connection: &S3ConnectionWithSecret,
        bucket: &str,
        key: &str,
    ) -> AppResult<ObjectMetadata> {
        let client = Self::create_s3_client(connection).await;

        let result = client
            .head_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| AppError::S3Error(e.to_string()))?;

        let mut custom_metadata = HashMap::new();
        if let Some(metadata) = result.metadata() {
            for (k, v) in metadata {
                custom_metadata.insert(k.clone(), v.clone());
            }
        }

        Ok(ObjectMetadata {
            key: key.to_string(),
            size: result.content_length().unwrap_or(0) as u64,
            last_modified: result.last_modified().map(|d| d.secs()),
            etag: result.e_tag().map(|s| s.to_string()),
            content_type: result.content_type().map(|s| s.to_string()),
            content_encoding: result.content_encoding().map(|s| s.to_string()),
            content_disposition: result.content_disposition().map(|s| s.to_string()),
            content_language: result.content_language().map(|s| s.to_string()),
            cache_control: result.cache_control().map(|s| s.to_string()),
            storage_class: result.storage_class().map(|s| s.as_str().to_string()),
            version_id: result.version_id().map(|s| s.to_string()),
            custom_metadata,
        })
    }
}
