import React, { useState } from "react";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  root: FileNode | null;
  onFileSelect: (path: string) => void;
  currentFile: string | null;
}

interface FileTreeNodeProps {
  node: FileNode;
  onFileSelect: (path: string) => void;
  currentFile: string | null;
  depth: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  onFileSelect,
  currentFile,
  depth,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth === 0); // Auto-expand root

  const handleClick = () => {
    if (node.is_dir) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const isSelected = !node.is_dir && currentFile === node.path;

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer select-none text-[13px] whitespace-nowrap transition-colors ${
          isSelected
            ? "bg-gray-300 dark:bg-gray-700 font-medium text-gray-900 dark:text-white"
            : "text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
        onClick={handleClick}
      >
        {node.is_dir && (
          <span className="mr-1.5 text-[10px] w-4 text-center flex-shrink-0">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
        {!node.is_dir && (
          <span className="mr-1.5 text-[10px] w-4 text-center flex-shrink-0">
            📄
          </span>
        )}
        <span className="overflow-hidden text-ellipsis">{node.name}</span>
      </div>
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <FileTreeNode
              key={`${child.path}-${idx}`}
              node={child}
              onFileSelect={onFileSelect}
              currentFile={currentFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  root,
  onFileSelect,
  currentFile,
}) => {
  if (!root) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 text-gray-500 dark:text-gray-500 text-[13px] text-center">
          No project opened
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-md  bg-white">
      <div className="px-3 py-1.5 font-bold text-lg text-gray-800 dark:text-gray-300">
        Files
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {root.children && root.children.length > 0 ? (
          root.children.map((child, idx) => (
            <FileTreeNode
              key={`${child.path}-${idx}`}
              node={child}
              onFileSelect={onFileSelect}
              currentFile={currentFile}
              depth={0}
            />
          ))
        ) : (
          <div className="p-4 text-gray-500 dark:text-gray-500 text-[13px] text-center">
            Empty project
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTree;
