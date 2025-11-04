import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { FileNode } from "./FileTree";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
  onProjectOpened: (projectPath: string, fileTree: FileNode) => void;
  recentProjects: string[];
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onProjectOpened,
  recentProjects,
}) => {
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

      const tree = await invoke<FileNode>("open_project", { path: selected });
      onProjectOpened(selected, tree);
    } catch (error) {
      console.error("Failed to open project:", error);
      alert(`Failed to open project: ${error}`);
    }
  };

  const handleCreateProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Directory for New Project",
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      const tree = await invoke<FileNode>("create_new_project", {
        projectPath: selected,
      });
      onProjectOpened(selected, tree);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert(`Failed to create project: ${error}`);
    }
  };

  const handleOpenRecentProject = async (projectPath: string) => {
    try {
      const tree = await invoke<FileNode>("open_project", { path: projectPath });
      onProjectOpened(projectPath, tree);
    } catch (error) {
      console.error("Failed to open recent project:", error);
      alert(`Failed to open project: ${error}`);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">Welcome to Incipit</h1>
        <p className="welcome-subtitle">
          A modern LaTeX editor powered by Tectonic
        </p>

        <div className="welcome-actions">
          <button className="welcome-button primary" onClick={handleCreateProject}>
            <span className="button-icon">+</span>
            Create New Project
          </button>
          <button className="welcome-button secondary" onClick={handleOpenProject}>
            <span className="button-icon">📁</span>
            Open Existing Project
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="recent-projects">
            <h2 className="recent-title">Recent Projects</h2>
            <div className="recent-list">
              {recentProjects.slice(0, 5).map((path) => (
                <button
                  key={path}
                  className="recent-project-item"
                  onClick={() => handleOpenRecentProject(path)}
                  title={path}
                >
                  <span className="recent-icon">📄</span>
                  <span className="recent-path">{path}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
