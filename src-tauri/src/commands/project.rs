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
    pub root_file: String,
    pub project_settings: serde_json::Value,
}

impl Default for ProjectMeta {
    fn default() -> Self {
        Self {
            last_opened_file: Some("main.tex".to_string()),
            root_file: "main.tex".to_string(),
            project_settings: serde_json::json!({
                "created_at": chrono::Utc::now().to_rfc3339(),
            }),
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

#[tauri::command]
pub async fn create_new_project(project_path: String) -> Result<FileNode, String> {
    let project_dir = PathBuf::from(&project_path);

    // Create the project directory if it doesn't exist
    if !project_dir.exists() {
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("Failed to create project directory: {}", e))?;
    }

    // Check if directory is empty (or only has hidden files)
    let entries: Vec<_> = fs::read_dir(&project_dir)
        .map_err(|e| format!("Failed to read project directory: {}", e))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            !name_str.starts_with('.')
        })
        .collect();

    if !entries.is_empty() {
        return Err("Directory is not empty. Please choose an empty directory for the new project.".to_string());
    }

    // Create build directory
    let build_dir = project_dir.join("build");
    fs::create_dir_all(&build_dir)
        .map_err(|e| format!("Failed to create build directory: {}", e))?;

    // Create default main.tex file
    let main_tex_path = project_dir.join("main.tex");
    let default_content = r#"\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{graphicx}
\usepackage{amsmath}

\title{New LaTeX Project}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}

Welcome to your new LaTeX project! This is a properly configured project with:

\begin{itemize}
    \item A dedicated build directory for compiled outputs
    \item Project-based compilation with Tectonic
    \item Support for multi-file projects with \texttt{\textbackslash input} and \texttt{\textbackslash include}
\end{itemize}

\section{Getting Started}

Start editing this file or create new \texttt{.tex} files in your project.
Use the file tree on the left to navigate between files.

\subsection{Mathematical Equations}

Here's an example equation:
\[
    E = mc^2
\]

\end{document}"#;

    fs::write(&main_tex_path, default_content)
        .map_err(|e| format!("Failed to create main.tex: {}", e))?;

    // Create .incipit metadata file
    let meta = ProjectMeta::default();
    save_project_meta(project_path.clone(), meta).await?;

    // Build and return file tree
    build_file_tree(&project_dir, &project_dir)
}

#[tauri::command]
pub async fn check_pdf_exists(project_path: String, file_path: String) -> Result<bool, String> {
    let project_dir = PathBuf::from(&project_path);

    // Get the PDF name from the tex file name
    let pdf_name = PathBuf::from(&file_path)
        .file_stem()
        .ok_or("Invalid file path")?
        .to_str()
        .ok_or("Invalid file name")?
        .to_string()
        + ".pdf";

    let pdf_path = project_dir.join("build").join(&pdf_name);
    Ok(pdf_path.exists())
}

#[tauri::command]
pub async fn load_pdf(project_path: String, file_path: String) -> Result<Vec<u8>, String> {
    let project_dir = PathBuf::from(&project_path);

    // Get the PDF name from the tex file name
    let pdf_name = PathBuf::from(&file_path)
        .file_stem()
        .ok_or("Invalid file path")?
        .to_str()
        .ok_or("Invalid file name")?
        .to_string()
        + ".pdf";

    let pdf_path = project_dir.join("build").join(&pdf_name);

    if !pdf_path.exists() {
        return Err(format!("PDF not found at: {}", pdf_path.display()));
    }

    fs::read(&pdf_path)
        .map_err(|e| format!("Failed to read PDF: {}", e))
}
