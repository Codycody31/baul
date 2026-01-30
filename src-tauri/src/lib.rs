mod commands;
mod error;
mod models;
mod services;
mod state;

use std::collections::HashMap;

use log::{debug, info, warn};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

use models::S3ConnectionWithSecret;
use services::ConfigService;
use services::CredentialService;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .setup(|app| {
            info!("Baul S3 Client starting up");

            // Load saved connections from config file
            let state = app.state::<AppState>();

            match ConfigService::load_connections() {
                Ok(connections) => {
                    let connection_count = connections.len();
                    debug!("Found {} saved connections", connection_count);

                    let rt = tokio::runtime::Runtime::new().unwrap();
                    rt.block_on(async {
                        let mut state_connections: HashMap<String, S3ConnectionWithSecret> =
                            HashMap::new();

                        for (id, conn) in connections {
                            // Try to get secret from keychain
                            match CredentialService::get_secret(&id) {
                                Ok(secret_key) => {
                                    debug!("Loaded credentials for connection: {}", conn.name);
                                    let full_conn = S3ConnectionWithSecret {
                                        id: conn.id,
                                        name: conn.name,
                                        provider: conn.provider,
                                        endpoint: conn.endpoint,
                                        region: conn.region,
                                        access_key: conn.access_key,
                                        secret_key,
                                        use_ssl: conn.use_ssl,
                                        use_path_style: conn.use_path_style,
                                        created_at: conn.created_at,
                                        updated_at: conn.updated_at,
                                    };
                                    state_connections.insert(id, full_conn);
                                }
                                Err(e) => {
                                    warn!(
                                        "Failed to load credentials for connection '{}': {}",
                                        conn.name, e
                                    );
                                    // Still add the connection but with empty secret
                                    let full_conn = S3ConnectionWithSecret {
                                        id: conn.id,
                                        name: conn.name,
                                        provider: conn.provider,
                                        endpoint: conn.endpoint,
                                        region: conn.region,
                                        access_key: conn.access_key,
                                        secret_key: String::new(),
                                        use_ssl: conn.use_ssl,
                                        use_path_style: conn.use_path_style,
                                        created_at: conn.created_at,
                                        updated_at: conn.updated_at,
                                    };
                                    state_connections.insert(id, full_conn);
                                }
                            }
                        }

                        *state.connections.lock().await = state_connections;
                    });

                    info!("Loaded {} connections from config", connection_count);
                }
                Err(e) => {
                    warn!("No saved connections found or failed to load: {}", e);
                }
            }

            info!("Baul initialization complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Connection commands
            commands::create_connection,
            commands::list_connections,
            commands::get_connection,
            commands::update_connection,
            commands::delete_connection,
            commands::test_connection,
            commands::export_connections,
            commands::import_connections,
            // Bucket commands
            commands::list_buckets,
            commands::create_bucket,
            commands::delete_bucket,
            commands::get_bucket_location,
            commands::head_bucket,
            commands::get_bucket_versioning,
            commands::get_bucket_stats,
            // Object commands
            commands::list_objects,
            commands::get_object_details,
            commands::get_object_metadata,
            commands::upload_file,
            commands::download_file,
            commands::delete_objects,
            commands::create_folder,
            commands::get_presigned_url,
            commands::get_object_text,
            commands::copy_object,
            commands::rename_object,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
