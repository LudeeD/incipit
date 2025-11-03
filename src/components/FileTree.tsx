import React, { useState } from "react";
import "./FileTree.css";

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
    <div className="file-tree-node">
      <div
        className={`file-tree-item ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.is_dir && (
          <span className="icon">{isExpanded ? "▼" : "▶"}</span>
        )}
        {!node.is_dir && <span className="icon">📄</span>}
        <span className="name">{node.name}</span>
      </div>
      {node.is_dir && isExpanded && node.children && (
        <div className="file-tree-children">
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

const FileTree: React.FC<FileTreeProps> = ({ root, onFileSelect, currentFile }) => {
  if (!root) {
    return (
      <div className="file-tree-container">
        <div className="file-tree-empty">No project opened</div>
      </div>
    );
  }

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">Project Files</div>
      <div className="file-tree-content">
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
          <div className="file-tree-empty">Empty project</div>
        )}
      </div>
    </div>
  );
};

export default FileTree;
