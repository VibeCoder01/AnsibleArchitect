
"use client";

import * as React from "react";
import { File, Folder, FolderOpen, ChevronsRightLeft, FolderPlus } from 'lucide-react';
import type { Project, FileTreeNode } from "@/types/ansible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ProjectExplorerProps {
  project: Project | null;
  onFileSelect: (path: string) => void;
  activeFilePath: string | null;
  onCreateDefaultProject: () => void;
}

function buildFileTree(files: { path: string }[]): FileTreeNode[] {
  const root: FileTreeNode = { name: 'root', path: '', type: 'directory', children: [] };

  files.forEach(file => {
    const parts = file.path.split('/').filter(p => p);
    let currentNode = root;

    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const childPath = parts.slice(0, index + 1).join('/');

      let childNode = currentNode.children?.find(node => node.name === part);

      if (!childNode) {
        childNode = {
          name: part,
          path: childPath,
          type: isLastPart ? 'file' : 'directory',
          children: isLastPart ? undefined : [],
        };
        currentNode.children?.push(childNode);
      }
    });
  });
  
  // Sort entries: folders first, then files, both alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children);
      }
    });
  };

  if(root.children) {
    sortNodes(root.children);
    return root.children;
  }
  return [];
}


const TreeNode: React.FC<{
  node: FileTreeNode;
  level: number;
  onFileSelect: (path: string) => void;
  activeFilePath: string | null;
}> = ({ node, level, onFileSelect, activeFilePath }) => {
  const [isExpanded, setIsExpanded] = React.useState(level < 2); // Auto-expand top levels

  if (node.type === 'file') {
    const isActive = node.path === activeFilePath;
    return (
      <div
        style={{ paddingLeft: `${level * 1}rem` }}
        className={cn(
            "flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer text-sm",
            isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
        )}
        onClick={() => onFileSelect(node.path)}
      >
        <File className="w-4 h-4 flex-shrink-0" />
        <span className="truncate" title={node.name}>{node.name}</span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }}>
      <div
        className="flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer text-sm hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0 text-primary" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0 text-primary" />
        )}
        <span className="font-medium truncate" title={node.name}>{node.name}</span>
      </div>
      {isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} level={level + 1} onFileSelect={onFileSelect} activeFilePath={activeFilePath} />
          ))}
        </div>
      )}
    </div>
  );
};

export function ProjectExplorer({ project, onFileSelect, activeFilePath, onCreateDefaultProject }: ProjectExplorerProps) {
  const fileTree = React.useMemo(() => {
    if (!project?.files) return [];
    return buildFileTree(project.files);
  }, [project]);

  if (!project) {
    return (
      <div className="p-4 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
        <ChevronsRightLeft className="w-12 h-12 mx-auto mb-3 opacity-60" />
        <p className="font-medium text-sm">No Project Loaded</p>
        <p className="text-xs mt-1">Use 'Import Project' or create a default structure.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onCreateDefaultProject}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Create Default Project
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex-shrink-0">
        <h3 className="font-semibold text-base truncate" title={project.name}>{project.name}</h3>
      </div>
      <ScrollArea className="flex-grow p-1">
        {fileTree.map(node => (
          <TreeNode key={node.path} node={node} level={0} onFileSelect={onFileSelect} activeFilePath={activeFilePath} />
        ))}
      </ScrollArea>
    </div>
  );
}
