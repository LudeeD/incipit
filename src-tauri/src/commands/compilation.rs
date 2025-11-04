use std::path::PathBuf;
use tectonic::config::PersistentConfig;
use tectonic::driver::{OutputFormat, ProcessingSessionBuilder};
use tectonic_status_base::NoopStatusBackend;

#[tauri::command]
pub async fn compile_latex_project(
    project_path: String,
    file_path: String,
    source: String,
) -> Result<Vec<u8>, String> {
    // Use Tectonic library API for in-process compilation with multi-file support
    tauri::async_runtime::spawn_blocking(move || {
        let project_dir = PathBuf::from(&project_path);
        let full_file_path = project_dir.join(&file_path);

        // Write current editor content to disk (required for \input{} to work)
        std::fs::write(&full_file_path, &source)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        // Ensure build directory exists
        let build_dir = project_dir.join("build");
        std::fs::create_dir_all(&build_dir)
            .map_err(|e| format!("Failed to create build directory: {}", e))?;

        eprintln!("Compiling with Tectonic library API");
        eprintln!("Project dir: {}", project_dir.display());
        eprintln!("File path: {}", file_path);

        // Set up status backend (no output)
        let mut status = NoopStatusBackend::default();

        // Get default bundle for LaTeX packages
        let config = PersistentConfig::open(false)
            .map_err(|e| format!("Failed to open Tectonic config: {}", e))?;

        let bundle = config
            .default_bundle(false, &mut status)
            .map_err(|e| format!("Failed to get bundle: {}", e))?;

        let format_cache = config
            .format_cache_path()
            .map_err(|e| format!("Failed to get format cache path: {}", e))?;

        // Build the processing session
        let mut builder = ProcessingSessionBuilder::default();
        builder
            .bundle(bundle)
            .primary_input_path(&full_file_path)
            .filesystem_root(&project_dir)  // Critical: allows \input{} to work
            .tex_input_name(&file_path)
            .format_name("latex")
            .format_cache_path(&format_cache)
            .output_dir(&build_dir)  // Output to build/ directory
            .output_format(OutputFormat::Pdf)
            .keep_logs(false)
            .keep_intermediates(false)
            .print_stdout(false);

        // Create and run the session
        let mut session = builder
            .create(&mut status)
            .map_err(|e| format!("Failed to create session: {}", e))?;

        session
            .run(&mut status)
            .map_err(|e| format!("LaTeX compilation failed: {}", e))?;

        eprintln!("Tectonic compilation completed successfully");

        // Read the generated PDF from build/ directory
        let pdf_name = PathBuf::from(&file_path)
            .file_stem()
            .ok_or("Invalid file path")?
            .to_str()
            .ok_or("Invalid file name")?
            .to_string()
            + ".pdf";

        let pdf_path = build_dir.join(&pdf_name);

        if !pdf_path.exists() {
            return Err(format!("PDF not found at: {}", pdf_path.display()));
        }

        eprintln!("Found PDF at: {}", pdf_path.display());

        let pdf_output = std::fs::read(&pdf_path)
            .map_err(|e| format!("Failed to read PDF: {}", e))?;

        if pdf_output.is_empty() {
            return Err("Compilation produced no output".to_string());
        }

        Ok(pdf_output)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
