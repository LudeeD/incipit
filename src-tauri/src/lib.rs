mod commands;

use commands::compilation::{compile_latex, compile_latex_project};
use commands::project::{load_project_meta, open_project, read_file, save_file, save_project_meta};
use commands::settings::{load_global_settings, save_global_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            compile_latex_project,
            open_project,
            read_file,
            save_file,
            load_project_meta,
            save_project_meta,
            load_global_settings,
            save_global_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
