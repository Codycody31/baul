use log::{debug, error, info, warn};
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::models::{BucketInfo, BucketStats};
use crate::services::S3Service;
use crate::state::AppState;

#[tauri::command]
pub async fn list_buckets(
    state: State<'_, AppState>,
    connection_id: String,
) -> AppResult<Vec<BucketInfo>> {
    debug!("Listing buckets for connection: {}", connection_id);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| {
            warn!("Connection not found when listing buckets: {}", connection_id);
            AppError::ConnectionNotFound(connection_id)
        })?;

    match S3Service::list_buckets(connection).await {
        Ok(buckets) => {
            info!("Found {} buckets", buckets.len());
            Ok(buckets)
        }
        Err(e) => {
            error!("Failed to list buckets: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn create_bucket(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
    region: Option<String>,
) -> AppResult<()> {
    info!(
        "Creating bucket '{}' in region {:?}",
        bucket_name,
        region.as_deref().unwrap_or("default")
    );

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| {
            warn!("Connection not found when creating bucket: {}", connection_id);
            AppError::ConnectionNotFound(connection_id)
        })?
        .clone();

    drop(connections);

    match S3Service::create_bucket(&connection, &bucket_name, region.as_deref()).await {
        Ok(()) => {
            info!("Successfully created bucket '{}'", bucket_name);
            Ok(())
        }
        Err(e) => {
            error!("Failed to create bucket '{}': {}", bucket_name, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn delete_bucket(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
) -> AppResult<()> {
    warn!("Deleting bucket '{}'", bucket_name);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| {
            warn!("Connection not found when deleting bucket: {}", connection_id);
            AppError::ConnectionNotFound(connection_id)
        })?
        .clone();

    drop(connections);

    match S3Service::delete_bucket(&connection, &bucket_name).await {
        Ok(()) => {
            info!("Successfully deleted bucket '{}'", bucket_name);
            Ok(())
        }
        Err(e) => {
            error!("Failed to delete bucket '{}': {}", bucket_name, e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_bucket_location(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
) -> AppResult<Option<String>> {
    debug!("Getting location for bucket '{}'", bucket_name);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    S3Service::get_bucket_location(&connection, &bucket_name).await
}

#[tauri::command]
pub async fn head_bucket(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
) -> AppResult<bool> {
    debug!("Checking if bucket '{}' exists", bucket_name);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    S3Service::head_bucket(&connection, &bucket_name).await
}

#[tauri::command]
pub async fn get_bucket_versioning(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
) -> AppResult<Option<String>> {
    debug!("Getting versioning status for bucket '{}'", bucket_name);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    S3Service::get_bucket_versioning(&connection, &bucket_name).await
}

#[tauri::command]
pub async fn get_bucket_stats(
    state: State<'_, AppState>,
    connection_id: String,
    bucket_name: String,
) -> AppResult<BucketStats> {
    debug!("Calculating stats for bucket '{}'", bucket_name);

    let connections = state.connections.lock().await;

    let connection = connections
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?
        .clone();

    drop(connections);

    match S3Service::get_bucket_stats(&connection, &bucket_name).await {
        Ok(stats) => {
            info!(
                "Bucket '{}' stats: {} objects, {} bytes",
                bucket_name, stats.object_count, stats.total_size
            );
            Ok(stats)
        }
        Err(e) => {
            warn!("Failed to get stats for bucket '{}': {}", bucket_name, e);
            Err(e)
        }
    }
}
