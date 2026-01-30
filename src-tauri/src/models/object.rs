use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3Object {
    pub key: String,
    pub size: u64,
    pub last_modified: i64,
    pub etag: Option<String>,
    pub content_type: Option<String>,
    pub is_directory: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectMetadata {
    pub key: String,
    pub size: u64,
    pub last_modified: Option<i64>,
    pub etag: Option<String>,
    pub content_type: Option<String>,
    pub content_encoding: Option<String>,
    pub content_disposition: Option<String>,
    pub content_language: Option<String>,
    pub cache_control: Option<String>,
    pub storage_class: Option<String>,
    pub version_id: Option<String>,
    pub custom_metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListObjectsResult {
    pub objects: Vec<S3Object>,
    pub prefixes: Vec<String>,
    pub continuation_token: Option<String>,
    pub is_truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgress {
    pub file_name: String,
    pub bytes_uploaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
}
