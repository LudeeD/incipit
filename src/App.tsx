import { useState, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { invoke } from "@tauri-apps/api/core";
import LatexEditor from "./components/LatexEditor";
import PdfViewer from "./components/PdfViewer";
import FileTree, { FileNode } from "./components/FileTree";
import WelcomeScreen from "./components/WelcomeScreen";
import Sidebar from "./components/Sidebar";
import { ArrowLeft } from "lucide-react";
import "./App.css";

type SidebarView =
  | "files"
  | "search"
  | "settings"
  | "git"
  | "outline"
  | "issues"
  | null;

interface GlobalSettings {
  recent_projects: string[];
  editor_settings: Record<string, unknown>;
}

interface ProjectMeta {
  last_opened_file: string | null;
  root_file: string;
  project_settings: Record<string, unknown>;
}

function App() {
  // Project state
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // Editor state
  const [latexContent, setLatexContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  // Global settings
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  // Sidebar state
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>(null);

  // Load global settings on startup
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await invoke<GlobalSettings>("load_global_settings");
      setRecentProjects(settings.recent_projects);
      console.log("Loaded settings:", settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleProjectOpened = async (path: string, tree: FileNode) => {
    try {
      setFileTree(tree);
      setProjectPath(path);

      // Load project metadata
      const meta = await invoke<ProjectMeta>("load_project_meta", {
        projectPath: path,
      });

      // Auto-open last file or root file
      const fileToOpen = meta.last_opened_file || meta.root_file;
      if (fileToOpen) {
        await loadFile(path, fileToOpen);

        // Check if PDF exists in build directory, if not auto-compile
        await checkAndAutoCompile(path, fileToOpen);
      }

      // Update global settings with recent project
      await updateRecentProjects(path);
    } catch (error) {
      console.error("Failed to initialize project:", error);
      alert(`Failed to initialize project: ${error}`);
    }
  };

  const checkAndAutoCompile = async (projPath: string, filePath: string) => {
    try {
      // Check if PDF exists in build directory
      const pdfExists = await invoke<boolean>("check_pdf_exists", {
        projectPath: projPath,
        filePath: filePath,
      });

      if (pdfExists) {
        console.log("PDF found in build directory, loading it...");
        // Load the existing PDF
        const pdfBytes = await invoke<number[]>("load_pdf", {
          projectPath: projPath,
          filePath: filePath,
        });
        const pdf = new Uint8Array(pdfBytes);
        setPdfData(pdf);
      } else {
        console.log("No PDF found, auto-compiling...");
        // Auto-compile
        const pdfBytes = await invoke<number[]>("compile_latex_project", {
          projectPath: projPath,
          filePath: filePath,
          source: latexContent,
        });
        const pdf = new Uint8Array(pdfBytes);
        setPdfData(pdf);
        setCompilationError(null);
      }
    } catch (error) {
      // Don't show error on auto-compile/load failure, just log it
      console.log("Auto-compile/load skipped or failed:", error);
    }
  };

  const updateRecentProjects = async (path: string) => {
    try {
      const settings = await invoke<GlobalSettings>("load_global_settings");
      const updatedRecent = [
        path,
        ...settings.recent_projects.filter((p) => p !== path),
      ].slice(0, 10); // Keep last 10

      await invoke("save_global_settings", {
        settings: { ...settings, recent_projects: updatedRecent },
      });
      setRecentProjects(updatedRecent);
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
        "You have unsaved changes. Do you want to continue without saving?",
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

  const handleCloseProject = () => {
    // Warn about unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Do you want to close the project without saving?",
      );
      if (!confirmed) return;
    }

    // Reset all state
    setProjectPath(null);
    setFileTree(null);
    setCurrentFilePath(null);
    setLatexContent("");
    setHasUnsavedChanges(false);
    setPdfData(null);
    setCompilationError(null);
  };

  const isSidebarOpen = activeSidebarView !== null;

  // Show welcome screen if no project is open
  if (!projectPath) {
    return (
      <WelcomeScreen
        onProjectOpened={handleProjectOpened}
        recentProjects={recentProjects}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-100">
      <div className="flex flex-row items-center py-2">
        <div id="spacer" className="w-15"></div>
        <button
          onClick={handleCloseProject}
          className="flex items-center px-2 py-2 hover:bg-gray-200 rounded-md mr-2"
          title="Close project"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-lg  text-gray-800 dark:text-gray-300 mr-2">
          {projectPath.split("/").pop()}
        </span>
        <button
          onClick={handleSaveFile}
          className="px-2 py-0.5 text-[12px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded transition-all hover:bg-gray-50 hover:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasUnsavedChanges}
        >
          Save {hasUnsavedChanges && "*"}
        </button>
        <span className="text-[12px] text-gray-600 dark:text-gray-400 font-mono">
          {currentFilePath}
        </span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeView={activeSidebarView}
          onViewChange={setActiveSidebarView}
        />
        <PanelGroup direction="horizontal" className=" dark:bg-gray-800">
          {isSidebarOpen && (
            <>
              <Panel id="sidebar" minSize={10} maxSize={20} order={1}>
                {activeSidebarView === "files" && (
                  <FileTree
                    root={fileTree}
                    onFileSelect={handleFileSelect}
                    currentFile={currentFilePath}
                  />
                )}
              </Panel>
              <PanelResizeHandle className="w-3 cursor-col-resize" />
            </>
          )}
          <Panel id="editor" minSize={25} order={2}>
            <LatexEditor
              initialContent={latexContent}
              onChange={handleLatexChange}
              onCompile={handleCompile}
              onError={handleError}
              projectPath={projectPath}
              filePath={currentFilePath}
            />
          </Panel>
          <PanelResizeHandle className="w-3 cursor-col-resize" />
          <Panel id="preview" minSize={25} order={3}>
            <PdfViewer pdfData={pdfData} error={compilationError} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;
