use std::path::PathBuf;
use tectonic::latex_to_pdf;

/// Find the tectonic binary in common locations
fn which_tectonic() -> Result<String, String> {
    let common_paths = vec![
        "/snap/bin/tectonic",
        "/usr/bin/tectonic",
        "/usr/local/bin/tectonic",
        "tectonic", // fallback to PATH
    ];

    for path in common_paths {
        if std::process::Command::new(path)
            .arg("--version")
            .output()
            .is_ok()
        {
            return Ok(path.to_string());
        }
    }

    Err("Tectonic not found. Please install tectonic.".to_string())
}

#[tauri::command]
pub async fn compile_latex(source: String) -> Result<Vec<u8>, String> {
    // Simple compilation for standalone documents
    tauri::async_runtime::spawn_blocking(move || {
        let pdf_data = latex_to_pdf(&source)
            .map_err(|e| format!("LaTeX compilation failed: {}", e))?;

        if pdf_data.is_empty() {
            return Err("Compilation produced no output".to_string());
        }

        Ok(pdf_data)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn compile_latex_project(
    project_path: String,
    file_path: String,
    source: String,
) -> Result<Vec<u8>, String> {
    // For multi-file projects, compile from disk so Tectonic can resolve dependencies
    tauri::async_runtime::spawn_blocking(move || {
        use std::process::Command;

        let project_dir = PathBuf::from(&project_path);
        let full_file_path = project_dir.join(&file_path);

        // Write current editor content to disk
        std::fs::write(&full_file_path, &source)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        // Use tectonic CLI - since biblatex is now disabled, no biber needed
        let tectonic_path = which_tectonic()
            .map_err(|e| format!("Tectonic not found: {}", e))?;

        eprintln!("Using tectonic at: {}", tectonic_path);
        eprintln!("Project dir: {}", project_dir.display());
        eprintln!("File path: {}", file_path);

        let output = Command::new(&tectonic_path)
            .arg("-X")
            .arg("compile")
            .arg(&file_path)
            .current_dir(&project_dir)
            .output()
            .map_err(|e| format!("Failed to execute tectonic: {}", e))?;

        eprintln!("Tectonic exit status: {}", output.status);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            eprintln!("Tectonic stdout: {}", stdout);
            eprintln!("Tectonic stderr: {}", stderr);
            return Err(format!("LaTeX compilation failed:\n{}", stderr));
        }

        eprintln!("Tectonic compilation completed successfully");

        // Read the generated PDF - try both build/ directory and project directory
        // Tectonic -X compile usually outputs to build/, but some documents override this
        let pdf_name = PathBuf::from(&file_path)
            .file_stem()
            .ok_or("Invalid file path")?
            .to_str()
            .ok_or("Invalid file name")?
            .to_string() + ".pdf";

        // Try build/ directory first
        let build_dir = project_dir.join("build");
        let pdf_path_build = build_dir.join(&pdf_name);

        // Try project directory as fallback
        let pdf_path_main = project_dir.join(&pdf_name);

        let pdf_path = if pdf_path_build.exists() {
            eprintln!("Found PDF at: {}", pdf_path_build.display());
            pdf_path_build
        } else if pdf_path_main.exists() {
            eprintln!("Found PDF at: {}", pdf_path_main.display());
            pdf_path_main
        } else {
            return Err(format!("PDF not found. Checked:\n  - {}\n  - {}",
                pdf_path_build.display(), pdf_path_main.display()));
        };

        let pdf_output = std::fs::read(&pdf_path)
            .map_err(|e| format!("Failed to read output PDF from {}: {}", pdf_path.display(), e))?;

        if pdf_output.is_empty() {
            return Err("Compilation produced no output".to_string());
        }

        Ok(pdf_output)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
