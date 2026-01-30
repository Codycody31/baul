use chrono::Utc;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{S3Connection, S3ConnectionWithSecret, S3Provider};
use crate::services::{ConfigService, CredentialService, S3Service};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedConnection {
    pub name: String,
    pub provider: S3Provider,
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub use_ssl: bool,
    pub use_path_style: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionExport {
    pub version: u32,
    pub connections: Vec<ExportedConnection>,
}

#[tauri::command]
pub async fn create_connection(
    state: State<'_, AppState>,
    name: String,
    provider: S3Provider,
    endpoint: String,
    region: String,
    access_key: String,
    secret_key: String,
    use_ssl: bool,
    use_path_style: bool,
) -> AppResult<S3Connection> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    info!("Creating new connection '{}' for provider {:?}", name, provider);
    debug!(
        "Connection details - endpoint: {}, region: {}, path_style: {}",
        endpoint, region, use_path_style
    );

    let connection = S3ConnectionWithSecret {
        id: id.clone(),
        name: name.clone(),
        provider,
        endpoint,
        region,
        access_key,
        secret_key: secret_key.clone(),
        use_ssl,
        use_path_style,
        created_at: now,
        updated_at: now,
    };

    // Store secret in keychain
    if let Err(e) = CredentialService::store_secret(&id, &secret_key) {
        error!("Failed to store credentials in keychain for '{}': {}", name, e);
        return Err(e);
    }
    debug!("Stored credentials in keychain for connection '{}'", name);

    // Store connection in state
    let mut connections = state.connections.lock().await;
    connections.insert(id.clone(), connection.clone());

    // Persist to config file
    if let Err(e) = ConfigService::save_connection(&connection) {
        error!("Failed to save connection '{}' to config: {}", name, e);
        return Err(e);
    }

    info!("Successfully created connection '{}' (id: {})", name, id);
    Ok(connection.into())
}

#[tauri::command]
pub async fn list_connections(state: State<'_, AppState>) -> AppResult<Vec<S3Connection>> {
    let connections = state.connections.lock().await;
    debug!("Listing {} connections", connections.len());
    Ok(connections.values().cloned().map(|c| c.into()).collect())
}

#[tauri::command]
pub async fn get_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> AppResult<S3Connection> {
    debug!("Getting connection: {}", connection_id);
    let connections = state.connections.lock().await;
    connections
        .get(&connection_id)
        .cloned()
        .map(|c| c.into())
        .ok_or_else(|| {
            warn!("Connection not found: {}", connection_id);
            crate::error::AppError::ConnectionNotFound(connection_id)
        })
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, AppState>,
    connection_id: String,
    name: Option<String>,
    provider: Option<S3Provider>,
    endpoint: Option<String>,
    region: Option<String>,
    access_key: Option<String>,
    secret_key: Option<String>,
    use_ssl: Option<bool>,
    use_path_style: Option<bool>,
) -> AppResult<S3Connection> {
    info!("Updating connection: {}", connection_id);

    let mut connections = state.connections.lock().await;

    let connection = connections
        .get_mut(&connection_id)
        .ok_or_else(|| {
            warn!("Cannot update - connection not found: {}", connection_id);
            crate::error::AppError::ConnectionNotFound(connection_id.clone())
        })?;

    if let Some(ref name) = name {
        debug!("Updating name to: {}", name);
        connection.name = name.clone();
    }
    if let Some(provider) = provider {
        debug!("Updating provider to: {:?}", provider);
        connection.provider = provider;
    }
    if let Some(ref endpoint) = endpoint {
        debug!("Updating endpoint to: {}", endpoint);
        connection.endpoint = endpoint.clone();
    }
    if let Some(ref region) = region {
        debug!("Updating region to: {}", region);
        connection.region = region.clone();
    }
    if let Some(ref access_key) = access_key {
        debug!("Updating access key");
        connection.access_key = access_key.clone();
    }
    if let Some(ref secret_key) = secret_key {
        debug!("Updating secret key and storing in keychain");
        connection.secret_key = secret_key.clone();
        CredentialService::store_secret(&connection_id, secret_key)?;
    }
    if let Some(use_ssl) = use_ssl {
        debug!("Updating use_ssl to: {}", use_ssl);
        connection.use_ssl = use_ssl;
    }
    if let Some(use_path_style) = use_path_style {
        debug!("Updating use_path_style to: {}", use_path_style);
        connection.use_path_style = use_path_style;
    }

    connection.updated_at = Utc::now().timestamp();

    let updated = connection.clone();

    // Persist to config file
    ConfigService::save_connection(&updated)?;

    info!("Successfully updated connection: {}", connection_id);
    Ok(updated.into())
}

#[tauri::command]
pub async fn delete_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> AppResult<()> {
    info!("Deleting connection: {}", connection_id);

    let mut connections = state.connections.lock().await;
    let removed = connections.remove(&connection_id);

    if removed.is_none() {
        warn!("Connection to delete was not found in state: {}", connection_id);
    }

    // Delete from keychain
    if let Err(e) = CredentialService::delete_secret(&connection_id) {
        warn!("Failed to delete credentials from keychain: {}", e);
    }

    // Delete from config file
    ConfigService::delete_connection(&connection_id)?;

    info!("Successfully deleted connection: {}", connection_id);
    Ok(())
}

#[tauri::command]
pub async fn test_connection(
    endpoint: String,
    region: String,
    access_key: String,
    secret_key: String,
    use_ssl: bool,
    use_path_style: bool,
    provider: S3Provider,
) -> AppResult<bool> {
    info!("Testing connection to {:?} endpoint: {}", provider, endpoint);
    debug!(
        "Test connection params - region: {}, path_style: {}, ssl: {}",
        region, use_path_style, use_ssl
    );

    let temp_connection = S3ConnectionWithSecret {
        id: "test".to_string(),
        name: "test".to_string(),
        provider,
        endpoint: endpoint.clone(),
        region,
        access_key,
        secret_key,
        use_ssl,
        use_path_style,
        created_at: 0,
        updated_at: 0,
    };

    // Try to list buckets (will validate credentials)
    match S3Service::list_buckets(&temp_connection).await {
        Ok(buckets) => {
            info!(
                "Connection test successful - found {} buckets at {}",
                buckets.len(),
                endpoint
            );
            Ok(true)
        }
        Err(e) => {
            error!("Connection test failed for {}: {}", endpoint, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn export_connections(state: State<'_, AppState>) -> AppResult<String> {
    info!("Exporting connections");

    let connections = state.connections.lock().await;

    let exported: Vec<ExportedConnection> = connections
        .values()
        .map(|c| ExportedConnection {
            name: c.name.clone(),
            provider: c.provider.clone(),
            endpoint: c.endpoint.clone(),
            region: c.region.clone(),
            access_key: c.access_key.clone(),
            use_ssl: c.use_ssl,
            use_path_style: c.use_path_style,
        })
        .collect();

    let export = ConnectionExport {
        version: 1,
        connections: exported,
    };

    let json = serde_json::to_string_pretty(&export)?;

    info!("Exported {} connections", export.connections.len());
    Ok(json)
}

#[tauri::command]
pub async fn import_connections(
    state: State<'_, AppState>,
    json_data: String,
) -> AppResult<Vec<S3Connection>> {
    info!("Importing connections from JSON");

    let import: ConnectionExport = serde_json::from_str(&json_data)
        .map_err(|e| AppError::S3Error(format!("Invalid JSON format: {}", e)))?;

    if import.version != 1 {
        warn!("Unknown export version: {}", import.version);
        return Err(AppError::S3Error(format!(
            "Unsupported export version: {}",
            import.version
        )));
    }

    let mut imported_connections = Vec::new();
    let mut connections = state.connections.lock().await;

    for exported in import.connections {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        info!(
            "Importing connection '{}' for provider {:?}",
            exported.name, exported.provider
        );

        let connection = S3ConnectionWithSecret {
            id: id.clone(),
            name: exported.name.clone(),
            provider: exported.provider,
            endpoint: exported.endpoint,
            region: exported.region,
            access_key: exported.access_key,
            secret_key: String::new(), // Will need to be set by user
            use_ssl: exported.use_ssl,
            use_path_style: exported.use_path_style,
            created_at: now,
            updated_at: now,
        };

        // Store connection in state
        connections.insert(id.clone(), connection.clone());

        // Persist to config file (without secret key stored)
        if let Err(e) = ConfigService::save_connection(&connection) {
            error!(
                "Failed to save imported connection '{}' to config: {}",
                exported.name, e
            );
        }

        imported_connections.push(connection.into());
    }

    info!("Successfully imported {} connections", imported_connections.len());
    Ok(imported_connections)
}
