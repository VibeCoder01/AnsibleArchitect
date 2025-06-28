
"use client";

import * as React from "react";
import { File, Folder, FolderOpen, ChevronsRightLeft, FolderPlus, ListCollapse, ListTree, List as ListIcon } from 'lucide-react';
import type { Project, FileTreeNode } from "@/types/ansible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectExplorerProps {
  project: Project | null;
  onFileSelect: (path: string) => void;
  activeFilePath: string | null;
  onCreateDefaultProject: () => void;
  onAcceptFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
}

function buildFileTree(files: Project['files']): FileTreeNode[] {
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
      
      if (isLastPart && childNode.type === 'file') {
        childNode.isDefault = file.isDefault;
      } else {
        // Inherit default status upwards if any child is default
         if (file.isDefault) {
            childNode.isDefault = true;
         }
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
          node.isDefault = node.children.some(c => c.isDefault);
          if (node.isDefault) anyChildIsDefault = true;
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
  onAcceptFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  isExpanded: boolean;
  onToggleExpand: (path: string) => void;
}> = ({ node, level, onFileSelect, activeFilePath, onAcceptFolder, onDeleteFolder, isExpanded, onToggleExpand }) => {

  const handleNodeClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else {
      onToggleExpand(node.path);
    }
  };

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAcceptFolder(node.path);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteFolder(node.path);
  };


  const Icon = node.type === 'directory' ? (isExpanded ? FolderOpen : Folder) : File;
  const isActive = node.path === activeFilePath;

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }} className="relative group/item">
      <div
        className={cn(
          "flex items-center justify-between space-x-2 py-1.5 px-2 rounded-md cursor-pointer text-sm whitespace-nowrap",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
          node.isDefault && !isActive && "text-destructive"
        )}
        onClick={handleNodeClick}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Icon className={cn("w-4 h-4 flex-shrink-0", node.type === 'directory' && 'text-primary', node.isDefault && !isActive && 'text-destructive/80')} />
          <span className="truncate" title={node.name}>{node.name}</span>
        </div>
        
        {node.type === 'directory' && (
          <div className="flex items-center space-x-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
            {node.isDefault && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleAcceptClick}
                            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                            aria-label="Accept default folder"
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Accept Default Folder</p>
                    </TooltipContent>
                </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                     <button
                        onClick={handleDeleteClick}
                        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                        aria-label="Delete folder"
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>Delete Folder</p>
                </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {isExpanded && node.children && (
        <div className="overflow-hidden">
          {node.children.map(child => (
            <TreeNode 
                key={child.path} 
                node={child} 
                level={level + 1} 
                onFileSelect={onFileSelect} 
                activeFilePath={activeFilePath} 
                onAcceptFolder={onAcceptFolder}
                onDeleteFolder={onDeleteFolder}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export function ProjectExplorer({ project, onFileSelect, activeFilePath, onCreateDefaultProject, onAcceptFolder, onDeleteFolder }: ProjectExplorerProps) {
  const fileTree = React.useMemo(() => {
    if (!project?.files) return [];
    return buildFileTree(project.files);
  }, [project]);

  const [expandedNodes, setExpandedNodes] = React.useState(new Set<string>());
  const [customExpandedNodes, setCustomExpandedNodes] = React.useState(new Set<string>());
  const [expandMode, setExpandMode] = React.useState<'custom' | 'all' | 'none'>('custom');

  React.useEffect(() => {
    if (fileTree.length > 0) {
      const initialNodes = new Set<string>();
      const setDefaultExpansion = (nodes: FileTreeNode[], level: number) => {
        if (level >= 1) return; // Only expand top-level
        nodes.forEach(node => {
          if (node.type === 'directory') {
            initialNodes.add(node.path);
            if (node.children) {
              setDefaultExpansion(node.children, level + 1);
            }
          }
        });
      };
      setDefaultExpansion(fileTree, 0);
      setExpandedNodes(initialNodes);
      setCustomExpandedNodes(initialNodes);
      setExpandMode('custom');
    }
  }, [fileTree]);

  const getAllDirectoryPaths = React.useCallback((nodes: FileTreeNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (nodesToScan: FileTreeNode[]) => {
      nodesToScan.forEach(node => {
        if (node.type === 'directory') {
          paths.push(node.path);
          if (node.children) {
            traverse(node.children);
          }
        }
      });
    };
    traverse(nodes);
    return paths;
  }, []);

  const handleToggleExpandAll = () => {
    if (expandMode === 'custom') { // custom -> all
      setExpandMode('all');
      setExpandedNodes(new Set(getAllDirectoryPaths(fileTree)));
    } else if (expandMode === 'all') { // all -> none
      setExpandMode('none');
      setExpandedNodes(new Set());
    } else { // none -> custom
      setExpandMode('custom');
      setExpandedNodes(customExpandedNodes);
    }
  };
  
  const handleNodeToggle = (path: string) => {
    setExpandMode('custom');
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
    setCustomExpandedNodes(newExpanded);
  };

  const renderTree = (nodes: FileTreeNode[], level: number): React.ReactNode => {
    return nodes.map(node => (
      <TreeNode
        key={node.path}
        node={node}
        level={level}
        onFileSelect={onFileSelect}
        activeFilePath={activeFilePath}
        onAcceptFolder={onAcceptFolder}
        onDeleteFolder={onDeleteFolder}
        isExpanded={expandedNodes.has(node.path)}
        onToggleExpand={handleNodeToggle}
      />
    ));
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
  
  const ToggleIcon = expandMode === 'all' ? ListCollapse : expandMode === 'none' ? ListIcon : ListTree;
  const tooltipText = expandMode === 'all' ? "Collapse All" : expandMode === 'none' ? "Restore Last View" : "Expand All";

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex-shrink-0 flex items-center justify-between">
          <h3 className="font-semibold text-base truncate" title={project.name}>{project.name}</h3>
           <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleToggleExpandAll}>
                        <ToggleIcon className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2">
            {renderTree(fileTree, 0)}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
