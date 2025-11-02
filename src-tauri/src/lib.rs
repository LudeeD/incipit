use tectonic::latex_to_pdf;

#[tauri::command]
fn compile_latex(source: String) -> Result<Vec<u8>, String> {
    // Use Tectonic's simple API to compile LaTeX to PDF
    let pdf_data = latex_to_pdf(&source)
        .map_err(|e| format!("LaTeX compilation failed: {}", e))?;

    if pdf_data.is_empty() {
        return Err("Compilation produced no output".to_string());
    }

    Ok(pdf_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compile_latex])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
