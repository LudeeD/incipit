# Incipit

A modern LaTeX editor with live PDF preview, built with Tauri, React, and Tectonic.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🖊️ **Live LaTeX Editing** - CodeMirror 6 editor with syntax support
- 📄 **Real-time PDF Preview** - See your document as you type (500ms debounce)
- ↔️ **Resizable Split Panes** - Customize your workspace layout
- ⚡ **Fast Compilation** - Powered by Tectonic (Rust-based LaTeX engine)
- 🎨 **Dark Mode Support** - Automatically adapts to system preferences
- 🖥️ **Native Desktop App** - Built with Tauri for optimal performance

## Prerequisites

Before you begin, ensure you have the following installed:

### System Dependencies

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y libharfbuzz-dev libfontconfig1-dev libfreetype6-dev \
  libgraphite2-dev libicu-dev build-essential
```

**macOS:**
```bash
brew install harfbuzz fontconfig freetype graphite2 icu4c
```

**Windows:**
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- Tectonic will handle most dependencies automatically

### Development Tools

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)
- **npm** or **yarn** - Comes with Node.js

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd incipit
   ```

2. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

3. **Copy PDF.js worker to public directory:**
   ```bash
   mkdir -p public
   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
   ```

4. **Build Rust dependencies:**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

## Development

Run the application in development mode with hot-reload:

```bash
npm run tauri dev
```

This will:
- Start the Vite dev server
- Build the Rust backend
- Launch the Tauri application window
- Enable hot-reload for both frontend and backend changes

## Building for Production

Create a production build:

```bash
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
incipit/
├── src/                      # React frontend
│   ├── components/
│   │   ├── LatexEditor.tsx  # CodeMirror editor component
│   │   ├── LatexEditor.css
│   │   ├── PdfViewer.tsx    # PDF preview component
│   │   └── PdfViewer.css
│   ├── App.tsx              # Main app with split-pane layout
│   ├── App.css
│   └── main.tsx             # React entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tectonic LaTeX compilation
│   │   └── main.rs         # Tauri app entry
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── public/                  # Static assets
│   └── pdf.worker.min.mjs  # PDF.js worker
├── package.json
└── vite.config.ts
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CodeMirror 6** - Code editor
- **react-pdf** - PDF rendering
- **react-resizable-panels** - Split pane layout

### Backend
- **Tauri 2** - Desktop app framework
- **Rust** - Native backend
- **Tectonic** - LaTeX compilation engine (self-contained, no TeX Live required)

## Configuration

### Tauri Window Settings

Edit `src-tauri/tauri.conf.json` to customize:
- Window size and title
- App permissions
- Build targets

### Editor Settings

Modify `src/components/LatexEditor.tsx` to adjust:
- Debounce delay (default: 500ms)
- CodeMirror extensions
- Theme preferences

## Troubleshooting

### "Tectonic build failed" error
- Ensure all system dependencies are installed (see Prerequisites)
- Try cleaning the build: `cd src-tauri && cargo clean && cd ..`

### PDF not rendering
- Check that `pdf.worker.min.mjs` exists in the `public/` directory
- Restart the dev server after copying the worker file

### First compilation is slow
- Tectonic downloads LaTeX packages on first use
- Subsequent compilations will be much faster
- Packages are cached in `~/.cache/Tectonic/` (Linux/macOS)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Tectonic](https://tectonic-typesetting.github.io/) - Modern LaTeX engine
- [Tauri](https://tauri.app/) - Desktop app framework
- [CodeMirror](https://codemirror.net/) - Code editor
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering

## Roadmap

- [ ] Multi-file project support
- [ ] File management (open/save from filesystem)
- [ ] LaTeX package manager integration
- [ ] Custom templates
- [ ] Export options (different paper sizes, formats)
- [ ] Collaborative editing (future consideration)
