use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BucketInfo {
    pub name: String,
    pub created_at: Option<i64>,
    pub region: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BucketStats {
    pub name: String,
    pub object_count: u64,
    pub total_size: u64,
}
