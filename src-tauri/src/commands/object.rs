use log::{debug, error, info, warn};
use tauri::{AppHandle, Emitter, State};
use tokio::fs;

use crate::error::{AppError, AppResult};
use crate::models::{ListObjectsResult, ObjectMetadata, S3Object, UploadProgress};
use crate::services::S3Service;
use crate::state::AppState;

#[tauri::command]
pub async fn list_objects(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    prefix: String,
    max_keys: Option<u32>,
) -> AppResult<ListObjectsResult> {
    debug!(
        "Listing objects in bucket '{}' with prefix '{}' (max_keys: {:?})",
        bucket, prefix, max_keys
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let operator = S3Service::create_operator(connection, &bucket)?;

    match S3Service::list_objects(&operator, &prefix, max_keys).await {
        Ok(result) => {
            debug!(
                "Found {} objects and {} prefixes in '{}/{}' (truncated: {})",
                result.objects.len(),
                result.prefixes.len(),
                bucket,
                prefix,
                result.is_truncated
            );
            Ok(result)
        }
        Err(e) => {
            error!("Failed to list objects in '{}/{}': {}", bucket, prefix, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_object_details(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
) -> AppResult<S3Object> {
    debug!("Getting details for object '{}/{}'", bucket, key);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let operator = S3Service::create_operator(connection, &bucket)?;

    S3Service::get_object_details(&operator, &key).await
}

#[tauri::command]
pub async fn upload_file(
    app: AppHandle,
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
    file_path: String,
) -> AppResult<()> {
    info!("Uploading file '{}' to '{}/{}'", file_path, bucket, key);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    let operator = S3Service::create_operator(&connection, &bucket)?;

    let data = match fs::read(&file_path).await {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to read file '{}': {}", file_path, e);
            return Err(e.into());
        }
    };

    let total_bytes = data.len() as u64;
    let file_name = key.clone();

    debug!(
        "Read {} bytes from '{}', starting upload",
        total_bytes, file_path
    );

    // Emit start progress
    let _ = app.emit(
        "upload-progress",
        UploadProgress {
            file_name: file_name.clone(),
            bytes_uploaded: 0,
            total_bytes,
            percentage: 0.0,
        },
    );

    match S3Service::upload_object(&operator, &key, data).await {
        Ok(()) => {
            info!(
                "Successfully uploaded {} bytes to '{}/{}'",
                total_bytes, bucket, key
            );

            // Emit completion
            let _ = app.emit(
                "upload-progress",
                UploadProgress {
                    file_name,
                    bytes_uploaded: total_bytes,
                    total_bytes,
                    percentage: 100.0,
                },
            );

            Ok(())
        }
        Err(e) => {
            error!("Failed to upload '{}' to '{}/{}': {}", file_path, bucket, key, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn download_file(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
    destination: String,
) -> AppResult<()> {
    info!(
        "Downloading '{}/{}' to '{}'",
        bucket, key, destination
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    let operator = S3Service::create_operator(&connection, &bucket)?;

    let data = match S3Service::download_object(&operator, &key).await {
        Ok(data) => {
            debug!("Downloaded {} bytes from '{}/{}'", data.len(), bucket, key);
            data
        }
        Err(e) => {
            error!("Failed to download '{}/{}': {}", bucket, key, e);
            return Err(e);
        }
    };

    match fs::write(&destination, &data).await {
        Ok(()) => {
            info!(
                "Successfully saved {} bytes to '{}'",
                data.len(),
                destination
            );
            Ok(())
        }
        Err(e) => {
            error!("Failed to write file '{}': {}", destination, e);
            Err(e.into())
        }
    }
}

#[tauri::command]
pub async fn delete_objects(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    keys: Vec<String>,
) -> AppResult<()> {
    warn!("Deleting {} objects from bucket '{}'", keys.len(), bucket);
    debug!("Objects to delete: {:?}", keys);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    let operator = S3Service::create_operator(&connection, &bucket)?;

    let mut deleted_count = 0;
    for key in &keys {
        match S3Service::delete_object(&operator, key).await {
            Ok(()) => {
                debug!("Deleted '{}/{}'", bucket, key);
                deleted_count += 1;
            }
            Err(e) => {
                error!("Failed to delete '{}/{}': {}", bucket, key, e);
                return Err(e);
            }
        }
    }

    info!(
        "Successfully deleted {} objects from bucket '{}'",
        deleted_count, bucket
    );
    Ok(())
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    path: String,
) -> AppResult<()> {
    info!("Creating folder '{}/{}/'", bucket, path);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    let operator = S3Service::create_operator(&connection, &bucket)?;

    match S3Service::create_folder(&operator, &path).await {
        Ok(()) => {
            info!("Successfully created folder '{}/{}/'", bucket, path);
            Ok(())
        }
        Err(e) => {
            error!("Failed to create folder '{}/{}': {}", bucket, path, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_presigned_url(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
    expires_in_secs: Option<u64>,
) -> AppResult<String> {
    let expires = expires_in_secs.unwrap_or(3600);
    debug!(
        "Generating presigned URL for '{}/{}' (expires in {}s)",
        bucket, key, expires
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    S3Service::get_presigned_url(&connection, &bucket, &key, expires).await
}

#[tauri::command]
pub async fn get_object_text(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
    max_size: Option<u64>,
) -> AppResult<String> {
    let max = max_size.unwrap_or(1024 * 1024);
    debug!(
        "Reading text content from '{}/{}' (max {})",
        bucket, key, max
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    let operator = S3Service::create_operator(&connection, &bucket)?;

    match S3Service::get_object_content_as_text(&operator, &key, max).await {
        Ok(text) => {
            debug!(
                "Read {} characters of text from '{}/{}'",
                text.len(),
                bucket,
                key
            );
            Ok(text)
        }
        Err(e) => {
            warn!("Failed to read text from '{}/{}': {}", bucket, key, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn copy_object(
    state: State<'_, AppState>,
    connection_id: String,
    source_bucket: String,
    source_key: String,
    dest_bucket: String,
    dest_key: String,
) -> AppResult<()> {
    info!(
        "Copying '{}/{}' to '{}/{}'",
        source_bucket, source_key, dest_bucket, dest_key
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    match S3Service::copy_object(
        &connection,
        &source_bucket,
        &source_key,
        &dest_bucket,
        &dest_key,
    )
    .await
    {
        Ok(()) => {
            info!(
                "Successfully copied '{}/{}' to '{}/{}'",
                source_bucket, source_key, dest_bucket, dest_key
            );
            Ok(())
        }
        Err(e) => {
            error!(
                "Failed to copy '{}/{}' to '{}/{}': {}",
                source_bucket, source_key, dest_bucket, dest_key, e
            );
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn rename_object(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    old_key: String,
    new_key: String,
) -> AppResult<()> {
    info!(
        "Renaming '{}/{}' to '{}/{}'",
        bucket, old_key, bucket, new_key
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    match S3Service::rename_object(&connection, &bucket, &old_key, &new_key).await {
        Ok(()) => {
            info!(
                "Successfully renamed '{}/{}' to '{}/{}'",
                bucket, old_key, bucket, new_key
            );
            Ok(())
        }
        Err(e) => {
            error!(
                "Failed to rename '{}/{}' to '{}': {}",
                bucket, old_key, new_key, e
            );
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_object_metadata(
    state: State<'_, AppState>,
    connection_id: String,
    bucket: String,
    key: String,
) -> AppResult<ObjectMetadata> {
    debug!("Getting metadata for '{}/{}'", bucket, key);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    match S3Service::get_object_metadata(&connection, &bucket, &key).await {
        Ok(metadata) => {
            debug!("Retrieved metadata for '{}/{}'", bucket, key);
            Ok(metadata)
        }
        Err(e) => {
            error!("Failed to get metadata for '{}/{}': {}", bucket, key, e);
            Err(e)
        }
    }
}
