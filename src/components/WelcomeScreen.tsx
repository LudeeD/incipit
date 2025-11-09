import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { FileNode } from "./FileTree";
import { Plus, FolderOpen, File } from "lucide-react";

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
      const tree = await invoke<FileNode>("open_project", {
        path: projectPath,
      });
      onProjectOpened(projectPath, tree);
    } catch (error) {
      console.error("Failed to open recent project:", error);
      alert(`Failed to open project: ${error}`);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-left max-w-md w-full px-6">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          Welcome to Incipit
        </h1>
        <p className="text-base mb-10 text-gray-600 dark:text-gray-400">
          A modern LaTeX editor powered by Tectonic
        </p>

        <div className="flex flex-col gap-3 mb-12">
          <button
            className="flex items-center gap-3 px-5 py-4 text-base font-semibold cursor-pointer transition-colors bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            onClick={handleCreateProject}
          >
            <Plus size={20} />
            <span>Create New Project</span>
          </button>
          <button
            className="flex items-center gap-3 px-5 py-4 text-base font-medium cursor-pointer transition-colors bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700"
            onClick={handleOpenProject}
          >
            <FolderOpen size={20} />
            <span>Open Existing Project</span>
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-xs font-semibold mb-4 uppercase tracking-wider text-gray-500 dark:text-gray-500">
              Recent Projects
            </h2>
            <div className="flex flex-col gap-2">
              {recentProjects.slice(0, 5).map((path) => (
                <button
                  key={path}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 text-gray-900 text-left cursor-pointer transition-colors hover:bg-gray-50 hover:border-gray-300 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750 dark:hover:border-gray-600"
                  onClick={() => handleOpenRecentProject(path)}
                  title={path}
                >
                  <File size={16} className="flex-shrink-0" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {path}
                  </span>
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
