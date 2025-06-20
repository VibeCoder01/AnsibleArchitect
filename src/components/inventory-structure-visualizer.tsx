
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Server, FolderTree, AlertTriangle, ToyBrick, Network, Maximize2, Minimize2 } from "lucide-react";

interface InventoryNode {
  id: string;
  name: string;
  type: 'group' | 'host' | 'ungrouped_host' | 'all_group';
  children: InventoryNode[];
  // ansibleVars?: Record<string, any>; // For future use
}

interface InventoryStructureVisualizerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Placeholder for the actual tree node rendering component
const TreeNodeDisplay: React.FC<{ node: InventoryNode; level: number; expandedNodes: Set<string>; onToggleExpand: (nodeId: string) => void }> = ({ node, level, expandedNodes, onToggleExpand }) => {
  const isExpanded = expandedNodes.has(node.id);
  const Icon = node.type === 'host' || node.type === 'ungrouped_host' ? Server : (node.name === 'all' ? Network : FolderTree);

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="py-0.5">
      <div className="flex items-center">
        {node.type === 'group' || node.type === 'all_group' ? (
          <Button variant="ghost" size="icon" className="w-6 h-6 mr-1" onClick={() => onToggleExpand(node.id)}>
            <ToyBrick className={`w-3 h-3 transform transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        ) : (
          <span className="w-6 mr-1"></span> 
        )}
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="text-sm">{node.name} {node.type === 'ungrouped_host' ? '(ungrouped)' : ''}</span>
      </div>
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map(child => (
            <TreeNodeDisplay key={child.id} node={child} level={level + 1} expandedNodes={expandedNodes} onToggleExpand={onToggleExpand} />
          ))}
        </div>
      )}
    </div>
  );
};


export function InventoryStructureVisualizer({ isOpen, onOpenChange }: InventoryStructureVisualizerProps) {
  const [jsonInput, setJsonInput] = React.useState<string>("");
  const [inventoryTree, setInventoryTree] = React.useState<InventoryNode | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());
  const [isMaximized, setIsMaximized] = React.useState(false);
  const { toast } = useToast();

  const parseAndBuildTree = (jsonData: any): InventoryNode | null => {
    if (typeof jsonData !== 'object' || jsonData === null) {
      setError("Invalid JSON: Root must be an object.");
      return null;
    }

    const hostVars = jsonData._meta?.hostvars || {};
    const allHosts = new Set<string>(Object.keys(hostVars));

    // Function to recursively build nodes
    const buildNode = (groupName: string, groupData: any, availableHosts: Set<string>, path: string[]): InventoryNode => {
      const node: InventoryNode = {
        id: `group:${groupName}`,
        name: groupName,
        type: groupName === 'all' ? 'all_group' : 'group',
        children: [],
      };
      
      if (groupData?.hosts && Array.isArray(groupData.hosts)) {
        groupData.hosts.forEach((hostName: string) => {
          if (typeof hostName === 'string') {
            node.children.push({
              id: `host:${hostName}`,
              name: hostName,
              type: 'host',
              children: [],
            });
            availableHosts.delete(hostName); 
          }
        });
      }

      if (groupData?.children && Array.isArray(groupData.children)) {
        groupData.children.forEach((childGroupName: string) => {
          if (typeof childGroupName === 'string' && jsonData[childGroupName] && !path.includes(childGroupName)) { 
            node.children.push(buildNode(childGroupName, jsonData[childGroupName], availableHosts, [...path, childGroupName]));
          }
        });
      }
      return node;
    };
    
    let rootNode: InventoryNode | null = null;

    if (jsonData.all) {
      rootNode = buildNode('all', jsonData.all, allHosts, ['all']);
    } else {
      rootNode = { id: 'group:__synthetic_root__', name: 'Inventory Root (Implicit)', type: 'group', children: [] };
      Object.keys(jsonData).forEach(key => {
        if (key !== '_meta' && typeof jsonData[key] === 'object') {
          rootNode!.children.push(buildNode(key, jsonData[key], allHosts, [key]));
        }
      });
    }
    
    if (allHosts.size > 0 && rootNode) {
        let ungroupedParent = rootNode.children.find(c => c.id === 'group:ungrouped');
        if (!ungroupedParent && jsonData.ungrouped) {
             ungroupedParent = buildNode('ungrouped', jsonData.ungrouped, allHosts, ['ungrouped']);
             rootNode.children.push(ungroupedParent);
        } else if (!ungroupedParent) {
            ungroupedParent = { id: 'group:ungrouped', name: 'ungrouped', type: 'group', children: []};
            rootNode.children.push(ungroupedParent);
        }
        
        allHosts.forEach(hostName => {
            if (!ungroupedParent!.children.some(c => c.id === `host:${hostName}`)) {
                ungroupedParent!.children.push({
                    id: `host:${hostName}`,
                    name: hostName,
                    type: 'ungrouped_host',
                    children: [],
                });
            }
        });
    }

    if (rootNode) {
      const initialExpanded = new Set<string>();
      initialExpanded.add(rootNode.id);
      if (rootNode.id === 'group:__synthetic_root__') { // Expand top-level groups if root is synthetic
        rootNode.children.forEach(child => initialExpanded.add(child.id));
      } else if (rootNode.name === 'all' && rootNode.children.length > 0) { // Expand direct children of 'all'
         rootNode.children.filter(c => c.type === 'group' || c.type === 'all_group').forEach(child => initialExpanded.add(child.id));
      }
      setExpandedNodes(initialExpanded);
    }
    
    return rootNode;
  };


  const handleVisualize = () => {
    if (!jsonInput.trim()) {
      setError("Please paste JSON output from 'ansible-inventory --list'.");
      setInventoryTree(null);
      return;
    }
    try {
      const data = JSON.parse(jsonInput);
      setError(null);
      const tree = parseAndBuildTree(data);
      setInventoryTree(tree);
      if (!tree) {
         toast({ title: "Visualization Error", description: error || "Could not build inventory tree.", variant: "destructive" });
      } else {
         toast({ title: "Inventory Visualized", description: "Inventory structure parsed and displayed.", className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300" });
      }
    } catch (e) {
      console.error("JSON Parsing Error:", e);
      setError(`Invalid JSON: ${(e as Error).message}`);
      setInventoryTree(null);
      toast({ title: "JSON Parsing Error", description: `Invalid JSON: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const dialogContentClasses = isMaximized
  ? "w-screen h-screen max-w-full max-h-full p-0 border-0 rounded-none fixed inset-0"
  : "w-[90vw] h-[85vh] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]";


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogContentClasses} flex flex-col p-0`}>
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle className="font-headline">Visualize Inventory Structure (from ansible-inventory --list)</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="w-8 h-8">
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="sr-only">{isMaximized ? 'Restore' : 'Maximize'}</span>
          </Button>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <div className="w-full md:w-1/3 p-3 border-b md:border-b-0 md:border-r flex flex-col">
            <Label htmlFor="jsonInventoryInput" className="mb-1.5 font-medium">Paste JSON Output:</Label>
            <Textarea
              id="jsonInventoryInput"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste output of 'ansible-inventory --list' here..."
              className="flex-1 resize-none text-xs font-mono h-40 md:h-auto"
            />
            <Button onClick={handleVisualize} className="mt-3 w-full">Visualize</Button>
            {error && <p className="mt-2 text-sm text-destructive flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5"/> {error}</p>}
          </div>

          <div className="flex-1 p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
                <Label htmlFor="zoomSlider" className="text-sm">Zoom: {zoomLevel}%</Label>
                <Button variant="outline" size="sm" onClick={() => { setInventoryTree(null); setJsonInput(""); setError(null); setZoomLevel(100); }} className="text-xs">Clear</Button>
            </div>
            <Slider
                id="zoomSlider"
                min={25}
                max={200}
                step={5}
                value={[zoomLevel]}
                onValueChange={(value) => setZoomLevel(value[0])}
                className="mb-3"
            />
            <ScrollArea className="flex-1 border rounded-md bg-muted/20 p-2">
              {inventoryTree ? (
                <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', width: `${100 * (100 / zoomLevel)}%` }} className="transition-transform duration-100">
                  <TreeNodeDisplay node={inventoryTree} level={0} expandedNodes={expandedNodes} onToggleExpand={handleToggleExpand} />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  <p>Inventory visualization will appear here.</p>
                  {!error && <p className="text-xs mt-1">Paste JSON and click "Visualize".</p>}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
