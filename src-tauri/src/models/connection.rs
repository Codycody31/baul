use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum S3Provider {
    Aws,
    Minio,
    CloudflareR2,
    Digitalocean,
    Backblaze,
    Wasabi,
    #[default]
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3Connection {
    pub id: String,
    pub name: String,
    pub provider: S3Provider,
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub use_ssl: bool,
    pub use_path_style: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3ConnectionWithSecret {
    pub id: String,
    pub name: String,
    pub provider: S3Provider,
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
    pub use_ssl: bool,
    pub use_path_style: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<S3ConnectionWithSecret> for S3Connection {
    fn from(conn: S3ConnectionWithSecret) -> Self {
        Self {
            id: conn.id,
            name: conn.name,
            provider: conn.provider,
            endpoint: conn.endpoint,
            region: conn.region,
            access_key: conn.access_key,
            use_ssl: conn.use_ssl,
            use_path_style: conn.use_path_style,
            created_at: conn.created_at,
            updated_at: conn.updated_at,
        }
    }
}
