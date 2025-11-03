use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    pub recent_projects: Vec<String>,
    pub editor_settings: serde_json::Value,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            recent_projects: Vec::new(),
            editor_settings: serde_json::json!({}),
        }
    }
}

fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to determine config directory")?;

    let app_config_dir = config_dir.join("incipit");

    // Create directory if it doesn't exist
    if !app_config_dir.exists() {
        fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(app_config_dir.join("settings.json"))
}

#[tauri::command]
pub async fn load_global_settings() -> Result<GlobalSettings, String> {
    let settings_path = get_settings_path()?;

    if !settings_path.exists() {
        return Ok(GlobalSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))
}

#[tauri::command]
pub async fn save_global_settings(settings: GlobalSettings) -> Result<(), String> {
    let settings_path = get_settings_path()?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))
}
