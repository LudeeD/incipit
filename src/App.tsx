import { useState, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import LatexEditor from "./components/LatexEditor";
import PdfViewer from "./components/PdfViewer";
import FileTree, { FileNode } from "./components/FileTree";
import "./App.css";

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{Welcome to Incipit}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

This is a simple LaTeX document. Start editing to see live updates!

\\subsection{Features}
\\begin{itemize}
    \\item Live PDF preview
    \\item Syntax highlighting
    \\item Resizable panels
    \\item Project management
\\end{itemize}

\\end{document}`;

interface GlobalSettings {
  recent_projects: string[];
  editor_settings: Record<string, unknown>;
}

interface ProjectMeta {
  last_opened_file: string | null;
  project_settings: Record<string, unknown>;
}

function App() {
  // Project state
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // Editor state
  const [latexContent, setLatexContent] = useState(DEFAULT_LATEX);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  // Load global settings on startup
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await invoke<GlobalSettings>("load_global_settings");
      // Could auto-open last project here if desired
      console.log("Loaded settings:", settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open LaTeX Project",
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      // Load project
      const tree = await invoke<FileNode>("open_project", { path: selected });
      setFileTree(tree);
      setProjectPath(selected);

      // Load project metadata
      const meta = await invoke<ProjectMeta>("load_project_meta", {
        projectPath: selected,
      });

      // Auto-open last file if available
      if (meta.last_opened_file) {
        await loadFile(selected, meta.last_opened_file);
      } else {
        // Reset to default
        setLatexContent(DEFAULT_LATEX);
        setCurrentFilePath(null);
        setHasUnsavedChanges(false);
      }

      // Update global settings with recent project
      await updateRecentProjects(selected);
    } catch (error) {
      console.error("Failed to open project:", error);
      alert(`Failed to open project: ${error}`);
    }
  };

  const updateRecentProjects = async (path: string) => {
    try {
      const settings = await invoke<GlobalSettings>("load_global_settings");
      const recentProjects = [
        path,
        ...settings.recent_projects.filter((p) => p !== path),
      ].slice(0, 10); // Keep last 10

      await invoke("save_global_settings", {
        settings: { ...settings, recent_projects: recentProjects },
      });
    } catch (error) {
      console.error("Failed to update recent projects:", error);
    }
  };

  const loadFile = async (projPath: string, filePath: string) => {
    try {
      const content = await invoke<string>("read_file", {
        projectPath: projPath,
        filePath: filePath,
      });

      setLatexContent(content);
      setCurrentFilePath(filePath);
      setHasUnsavedChanges(false);
      setPdfData(null); // Clear old PDF
      setCompilationError(null);
    } catch (error) {
      console.error("Failed to load file:", error);
      alert(`Failed to load file: ${error}`);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    if (!projectPath) return;

    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Do you want to continue without saving?"
      );
      if (!confirmed) return;
    }

    await loadFile(projectPath, filePath);

    // Update project metadata
    try {
      const meta = await invoke<ProjectMeta>("load_project_meta", {
        projectPath,
      });
      await invoke("save_project_meta", {
        projectPath,
        meta: { ...meta, last_opened_file: filePath },
      });
    } catch (error) {
      console.error("Failed to save project metadata:", error);
    }
  };

  const handleSaveFile = async () => {
    if (!projectPath || !currentFilePath) {
      alert("No file open to save");
      return;
    }

    try {
      await invoke("save_file", {
        projectPath,
        filePath: currentFilePath,
        content: latexContent,
      });

      setHasUnsavedChanges(false);
      console.log("File saved successfully");
    } catch (error) {
      console.error("Failed to save file:", error);
      alert(`Failed to save file: ${error}`);
    }
  };

  const handleLatexChange = (content: string) => {
    setLatexContent(content);
    setHasUnsavedChanges(true);
  };

  const handleCompile = async (pdf: Uint8Array) => {
    setPdfData(pdf);
    setCompilationError(null);
  };

  const handleError = (error: string) => {
    setCompilationError(error);
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <button onClick={handleOpenProject} className="toolbar-button">
          Open Project
        </button>
        {currentFilePath && (
          <>
            <button
              onClick={handleSaveFile}
              className="toolbar-button"
              disabled={!hasUnsavedChanges}
            >
              Save {hasUnsavedChanges && "*"}
            </button>
            <span className="current-file-label">{currentFilePath}</span>
          </>
        )}
      </div>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={35}>
          <FileTree
            root={fileTree}
            onFileSelect={handleFileSelect}
            currentFile={currentFilePath}
          />
        </Panel>
        <PanelResizeHandle className="resize-handle" />
        <Panel defaultSize={40} minSize={25}>
          <LatexEditor
            initialContent={latexContent}
            onChange={handleLatexChange}
            onCompile={handleCompile}
            onError={handleError}
            projectPath={projectPath}
            filePath={currentFilePath}
          />
        </Panel>
        <PanelResizeHandle className="resize-handle" />
        <Panel defaultSize={40} minSize={25}>
          <PdfViewer pdfData={pdfData} error={compilationError} />
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
