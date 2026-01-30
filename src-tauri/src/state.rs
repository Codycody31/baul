use std::collections::HashMap;
use tokio::sync::Mutex;

use crate::models::S3ConnectionWithSecret;

pub struct AppState {
    pub connections: Mutex<HashMap<String, S3ConnectionWithSecret>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }
}