use keyring::Entry;
use log::{debug, error, trace, warn};

use crate::error::{AppError, AppResult};

const SERVICE_NAME: &str = "dev.codycody31.baul";

pub struct CredentialService;

impl CredentialService {
    fn get_entry(connection_id: &str) -> AppResult<Entry> {
        trace!("Creating keyring entry for connection: {}", connection_id);
        Entry::new(SERVICE_NAME, connection_id)
            .map_err(|e| {
                error!("Failed to create keyring entry: {}", e);
                AppError::KeyringError(e.to_string())
            })
    }

    pub fn store_secret(connection_id: &str, secret_key: &str) -> AppResult<()> {
        debug!("Storing secret in keyring for connection: {}", connection_id);

        let entry = Self::get_entry(connection_id)?;
        entry
            .set_password(secret_key)
            .map_err(|e| {
                error!("Failed to store secret in keyring: {}", e);
                AppError::KeyringError(e.to_string())
            })?;

        debug!("Successfully stored secret in keyring");
        Ok(())
    }

    pub fn get_secret(connection_id: &str) -> AppResult<String> {
        trace!("Retrieving secret from keyring for connection: {}", connection_id);

        let entry = Self::get_entry(connection_id)?;
        entry
            .get_password()
            .map_err(|e| {
                warn!("Failed to retrieve secret from keyring: {}", e);
                AppError::KeyringError(e.to_string())
            })
    }

    pub fn delete_secret(connection_id: &str) -> AppResult<()> {
        debug!("Deleting secret from keyring for connection: {}", connection_id);

        let entry = Self::get_entry(connection_id)?;
        entry
            .delete_credential()
            .map_err(|e| {
                warn!("Failed to delete secret from keyring: {}", e);
                AppError::KeyringError(e.to_string())
            })?;

        debug!("Successfully deleted secret from keyring");
        Ok(())
    }
}
