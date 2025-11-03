use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMeta {
    pub last_opened_file: Option<String>,
    pub project_settings: serde_json::Value,
}

impl Default for ProjectMeta {
    fn default() -> Self {
        Self {
            last_opened_file: None,
            project_settings: serde_json::json!({}),
        }
    }
}

/// Recursively build a file tree structure
fn build_file_tree(path: &Path, root_path: &Path) -> Result<FileNode, String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let relative_path = path
        .strip_prefix(root_path)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string();

    let is_dir = path.is_dir();

    let children = if is_dir {
        let mut entries = fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory {}: {}", path.display(), e))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                // Skip hidden files and .incipit metadata
                let file_name = entry.file_name();
                let name_str = file_name.to_string_lossy();
                !name_str.starts_with('.') && name_str != ".incipit"
            })
            .filter_map(|entry| build_file_tree(&entry.path(), root_path).ok())
            .collect::<Vec<_>>();

        // Sort: directories first, then files, alphabetically
        entries.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });

        Some(entries)
    } else {
        None
    };

    Ok(FileNode {
        name,
        path: relative_path,
        is_dir,
        children,
    })
}

#[tauri::command]
pub async fn open_project(path: String) -> Result<FileNode, String> {
    let project_path = PathBuf::from(&path);

    if !project_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !project_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    build_file_tree(&project_path, &project_path)
}

#[tauri::command]
pub async fn read_file(project_path: String, file_path: String) -> Result<String, String> {
    let full_path = PathBuf::from(&project_path).join(&file_path);

    // Security check: ensure the file is within the project directory
    let canonical_project = PathBuf::from(&project_path)
        .canonicalize()
        .map_err(|e| format!("Invalid project path: {}", e))?;

    let canonical_file = full_path
        .canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !canonical_file.starts_with(&canonical_project) {
        return Err("Access denied: file is outside project directory".to_string());
    }

    fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

#[tauri::command]
pub async fn save_file(
    project_path: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let full_path = PathBuf::from(&project_path).join(&file_path);

    // Security check: ensure the file is within the project directory
    let canonical_project = PathBuf::from(&project_path)
        .canonicalize()
        .map_err(|e| format!("Invalid project path: {}", e))?;

    // For new files that don't exist yet, check the parent directory
    let path_to_check = if full_path.exists() {
        full_path.clone()
    } else {
        full_path
            .parent()
            .ok_or("Invalid file path")?
            .to_path_buf()
    };

    let canonical_check = path_to_check
        .canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !canonical_check.starts_with(&canonical_project) {
        return Err("Access denied: file is outside project directory".to_string());
    }

    fs::write(&full_path, content)
        .map_err(|e| format!("Failed to write file {}: {}", file_path, e))
}

#[tauri::command]
pub async fn load_project_meta(project_path: String) -> Result<ProjectMeta, String> {
    let meta_path = PathBuf::from(&project_path).join(".incipit");

    if !meta_path.exists() {
        return Ok(ProjectMeta::default());
    }

    let content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read project metadata: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project metadata: {}", e))
}

#[tauri::command]
pub async fn save_project_meta(project_path: String, meta: ProjectMeta) -> Result<(), String> {
    let meta_path = PathBuf::from(&project_path).join(".incipit");

    let content =
        serde_json::to_string_pretty(&meta).map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&meta_path, content).map_err(|e| format!("Failed to write metadata: {}", e))
}
