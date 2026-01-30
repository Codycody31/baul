use directories::ProjectDirs;
use log::{debug, error, info, trace};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::error::{AppError, AppResult};
use crate::models::{S3Connection, S3ConnectionWithSecret};

const CONFIG_FILE: &str = "connections.json";

pub struct ConfigService;

impl ConfigService {
    fn get_config_dir() -> AppResult<PathBuf> {
        let proj_dirs = ProjectDirs::from("dev", "codycody31", "baul")
            .ok_or_else(|| AppError::ConfigError("Could not determine config directory".into()))?;

        let config_dir = proj_dirs.config_dir().to_path_buf();

        if !config_dir.exists() {
            debug!("Creating config directory: {:?}", config_dir);
            fs::create_dir_all(&config_dir)?;
        }

        trace!("Config directory: {:?}", config_dir);
        Ok(config_dir)
    }

    fn get_config_path() -> AppResult<PathBuf> {
        let config_dir = Self::get_config_dir()?;
        Ok(config_dir.join(CONFIG_FILE))
    }

    pub fn load_connections() -> AppResult<HashMap<String, S3Connection>> {
        let config_path = Self::get_config_path()?;

        if !config_path.exists() {
            debug!("Config file does not exist: {:?}", config_path);
            return Ok(HashMap::new());
        }

        debug!("Loading connections from: {:?}", config_path);

        let content = match fs::read_to_string(&config_path) {
            Ok(c) => c,
            Err(e) => {
                error!("Failed to read config file: {}", e);
                return Err(e.into());
            }
        };

        let connections: HashMap<String, S3Connection> = match serde_json::from_str(&content) {
            Ok(c) => c,
            Err(e) => {
                error!("Failed to parse config file: {}", e);
                return Err(e.into());
            }
        };

        debug!("Loaded {} connections from config", connections.len());
        Ok(connections)
    }

    pub fn save_connections(connections: &HashMap<String, S3Connection>) -> AppResult<()> {
        let config_path = Self::get_config_path()?;

        trace!("Saving {} connections to: {:?}", connections.len(), config_path);

        let content = serde_json::to_string_pretty(connections)?;
        fs::write(&config_path, content)?;

        debug!("Saved {} connections to config", connections.len());
        Ok(())
    }

    pub fn save_connection(connection: &S3ConnectionWithSecret) -> AppResult<()> {
        info!("Saving connection '{}' to config", connection.name);

        let mut connections = Self::load_connections()?;
        connections.insert(connection.id.clone(), connection.clone().into());
        Self::save_connections(&connections)
    }

    pub fn delete_connection(connection_id: &str) -> AppResult<()> {
        info!("Deleting connection '{}' from config", connection_id);

        let mut connections = Self::load_connections()?;
        connections.remove(connection_id);
        Self::save_connections(&connections)
    }
}
