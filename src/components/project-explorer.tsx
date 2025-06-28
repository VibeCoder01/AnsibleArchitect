
"use client";

import * as React from "react";
import { File, Folder, FolderOpen, ChevronsRightLeft, FolderPlus, Trash2, CheckCircle } from 'lucide-react';
import type { Project, ProjectFile, FileTreeNode } from "@/types/ansible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectExplorerProps {
  project: Project | null;
  onFileSelect: (path: string) => void;
  activeFilePath: string | null;
  onCreateDefaultProject: () => void;
  onAcceptFileOrFolder: (path: string) => void;
  onDeleteFileOrFolder: (path: string) => void;
}

function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
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
          isDefault: file.isDefault,
        };
        currentNode.children?.push(childNode);
      } else if (childNode.type === 'file' && !isLastPart) {
        childNode.type = 'directory';
        childNode.children = childNode.children || [];
      }
      
      if (childNode.type === 'directory') {
          currentNode = childNode;
      }
    });
  });

  function setDirectoryDefaultStatus(nodes: FileTreeNode[]): boolean {
    let anyChildIsDefault = false;
    nodes.forEach(node => {
      if (node.type === 'directory' && node.children) {
        if (setDirectoryDefaultStatus(node.children)) {
          node.isDefault = true;
          anyChildIsDefault = true;
        } else {
          node.isDefault = false;
        }
      } else if (node.type === 'file' && node.isDefault) {
        anyChildIsDefault = true;
      }
    });
    return anyChildIsDefault;
  }
  if (root.children) {
      setDirectoryDefaultStatus(root.children);
  }
  
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
  onAccept: (path: string) => void;
  onDelete: (path: string, type: 'file' | 'directory') => void;
}> = ({ node, level, onFileSelect, activeFilePath, onAccept, onDelete }) => {
  const [isExpanded, setIsExpanded] = React.useState(level < 2);

  const handleNodeClick = (e: React.MouseEvent) => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const Icon = node.type === 'directory' ? (isExpanded ? FolderOpen : Folder) : File;
  const isActive = node.path === activeFilePath;

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }} className="relative group/item">
      <div
        className={cn(
          "flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer text-sm",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
          node.isDefault && !isActive && "bg-primary/5"
        )}
        onClick={handleNodeClick}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", node.type === 'directory' && 'text-primary')} />
        <span className="truncate" title={node.name}>{node.name}</span>
      </div>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-muted/50 rounded-md">
        {node.isDefault && (
          <Button variant="ghost" size="icon" className="w-6 h-6" title="Accept Default" onClick={() => onAccept(node.path)}>
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="w-6 h-6" title="Delete" onClick={() => onDelete(node.path, node.type)}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>

      {isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} level={level + 1} onFileSelect={onFileSelect} activeFilePath={activeFilePath} onAccept={onAccept} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};


export function ProjectExplorer({ project, onFileSelect, activeFilePath, onCreateDefaultProject, onAcceptFileOrFolder, onDeleteFileOrFolder }: ProjectExplorerProps) {
  const fileTree = React.useMemo(() => {
    if (!project?.files) return [];
    return buildFileTree(project.files);
  }, [project]);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = React.useState(false);
  const [pathToConfirmDelete, setPathToConfirmDelete] = React.useState<string | null>(null);

  const handleDeleteClick = (path: string, type: 'file' | 'directory') => {
    if (type === 'directory') {
      setPathToConfirmDelete(path);
      setIsConfirmDeleteDialogOpen(true);
    } else {
      onDeleteFileOrFolder(path);
    }
  };

  const confirmDelete = () => {
    if (pathToConfirmDelete) {
      onDeleteFileOrFolder(pathToConfirmDelete);
    }
    setIsConfirmDeleteDialogOpen(false);
    setPathToConfirmDelete(null);
  };

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
    <>
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex-shrink-0">
          <h3 className="font-semibold text-base truncate" title={project.name}>{project.name}</h3>
        </div>
        <ScrollArea className="flex-grow p-1">
          {fileTree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              level={0}
              onFileSelect={onFileSelect}
              activeFilePath={activeFilePath}
              onAccept={onAcceptFileOrFolder}
              onDelete={handleDeleteClick}
            />
          ))}
        </ScrollArea>
      </div>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder and all its contents: <br />
              <strong className="font-mono break-all">{pathToConfirmDelete}</strong>
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPathToConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
