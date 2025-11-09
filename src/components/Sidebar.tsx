import React from "react";
import {
  Files,
  Search,
  Settings,
  GitBranch,
  List,
  AlertCircle,
} from "lucide-react";

type SidebarView =
  | "files"
  | "search"
  | "settings"
  | "git"
  | "outline"
  | "issues"
  | null;

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const handleIconClick = (view: SidebarView) => {
    // Toggle: if clicking active view, close it. Otherwise, switch to new view
    onViewChange(activeView === view ? null : view);
  };

  const iconButtons = [
    { view: "files" as const, icon: Files, label: "Files", enabled: true },
    { view: "search" as const, icon: Search, label: "Search", enabled: false },
    { view: "git" as const, icon: GitBranch, label: "Git", enabled: false },
    { view: "outline" as const, icon: List, label: "Outline", enabled: false },
    {
      view: "issues" as const,
      icon: AlertCircle,
      label: "Issues",
      enabled: false,
    },
    {
      view: "settings" as const,
      icon: Settings,
      label: "Settings",
      enabled: false,
    },
  ];

  return (
    <div className="w-15 flex flex-col ">
      {iconButtons.map(({ view, icon: Icon, label, enabled }) => (
        <button
          key={view}
          onClick={() => enabled && handleIconClick(view)}
          className={`w-full h-14 flex items-center justify-center cursor-pointer transition-colors relative ${
            activeView === view
              ? "bg-blue-100 dark:bg-blue-900 border-l-2 border-blue-500"
              : enabled
                ? "hover:bg-gray-300 dark:hover:bg-gray-700"
                : "opacity-40 cursor-not-allowed"
          }`}
          title={label}
          disabled={!enabled}
        >
          <Icon size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
