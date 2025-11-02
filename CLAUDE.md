# Incipit - LaTeX Editor Project Notes

## Architecture Overview

This is a Tauri + React + TypeScript desktop application for editing and compiling LaTeX documents.

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Editor**: CodeMirror 6 with codemirror-lang-latex
- **Backend**: Tauri 2 (Rust)
- **LaTeX Engine**: Tectonic

## Key Patterns & Learnings

### Tauri Async Commands
For CPU-bound blocking operations (like LaTeX compilation), always use Tauri's async runtime:

```rust
#[tauri::command]
async fn compile_latex(source: String) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        // blocking work here
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
```

**Important**:
- Use `tauri::async_runtime::spawn_blocking` for blocking operations
- Don't use plain `tokio` - Tauri provides its own async runtime
- This keeps the UI responsive during compilation

### CodeMirror LaTeX Support
The editor uses `codemirror-lang-latex` which provides:
- Syntax highlighting (requires `syntaxHighlighting(defaultHighlightStyle)`)
- Auto-completion for LaTeX commands
- Auto-closing environments
- Hover tooltips
- Linting for LaTeX errors

**Important**: The `latex()` extension provides language support, but you must also add `syntaxHighlighting(defaultHighlightStyle)` to actually see syntax colors.

### State Management
- Editor content is tracked in React state (`currentContent`)
- Updates flow: Editor changes → `setCurrentContent` → Manual compile → Tauri backend
- No auto-compile to avoid blocking UI during typing

## Project Structure

```
src/
  components/
    LatexEditor.tsx       - Main editor component with CodeMirror
    LatexEditor.css       - Editor styling (light/dark mode)
src-tauri/
  src/
    lib.rs                - Tauri commands (compile_latex)
```

## Common Issues

1. **UI freezing during compile**: Make sure Tauri command is async with `spawn_blocking`
2. **No syntax highlighting**: Must include both `latex()` AND `syntaxHighlighting(defaultHighlightStyle)`
3. **Type errors with invoke**: Remember to specify type parameter: `invoke<number[]>("compile_latex", ...)`
