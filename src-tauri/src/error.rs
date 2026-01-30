use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("S3 operation failed: {0}")]
    S3Error(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Keyring error: {0}")]
    KeyringError(String),

    #[error("OpenDAL error: {0}")]
    OpendalError(#[from] opendal::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
