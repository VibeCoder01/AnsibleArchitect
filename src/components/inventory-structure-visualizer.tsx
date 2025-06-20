
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Server, FolderTree, AlertTriangle, ToyBrick, Network, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryNode {
  id: string;
  name: string;
  type: 'group' | 'host' | 'ungrouped_host' | 'all_group';
  children: InventoryNode[];
}

interface InventoryStructureVisualizerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const TreeNodeDisplay: React.FC<{ node: InventoryNode; level: number; expandedNodes: Set<string>; onToggleExpand: (nodeId: string) => void }> = ({ node, level, expandedNodes, onToggleExpand }) => {
  const isExpanded = expandedNodes.has(node.id);
  const Icon = node.type === 'host' || node.type === 'ungrouped_host' ? Server : (node.name === 'all' ? Network : FolderTree);

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="py-0.5">
      <div className="flex items-center">
        {(node.type === 'group' || node.type === 'all_group') && node.children.length > 0 ? (
          <Button variant="ghost" size="icon" className="w-6 h-6 mr-1" onClick={() => onToggleExpand(node.id)}>
            <ToyBrick className={`w-3 h-3 transform transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        ) : (
          <span className="w-6 mr-1 flex-shrink-0"></span>
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

  const [dialogPosition, setDialogPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartOffset, setDragStartOffset] = React.useState<{ x: number; y: number } | null>(null);
  const dialogContentRef = React.useRef<HTMLDivElement>(null);

  const clearVisualization = () => {
    setInventoryTree(null);
    setJsonInput("");
    setError(null);
    setZoomLevel(100);
    setExpandedNodes(new Set());
    setDialogPosition(null); 
  };

  const parseAndBuildTree = (jsonData: any): { tree: InventoryNode | null; error: string | null } => {
    if (typeof jsonData !== 'object' || jsonData === null) {
      return { tree: null, error: "Invalid inventory structure: Root must be an object." };
    }

    const hostVars = jsonData._meta?.hostvars || {};
    const allHostsOnSystem = new Set<string>(Object.keys(hostVars));
    const processedHosts = new Set<string>();
    let parseError: string | null = null;

    const buildNode = (groupName: string, groupData: any, path: string[]): InventoryNode => {
      const nodeId = `group:${path.join(':')}:${groupName}`;
      const node: InventoryNode = {
        id: nodeId,
        name: groupName,
        type: groupName === 'all' ? 'all_group' : 'group',
        children: [],
      };

      if (groupData?.hosts) {
        if (!Array.isArray(groupData.hosts)) {
          parseError = `Group '${groupName}' has a 'hosts' key that is not an array.`;
        } else {
          groupData.hosts.forEach((hostName: string) => {
            if (typeof hostName === 'string') {
              node.children.push({
                id: `host:${hostName}`,
                name: hostName,
                type: 'host',
                children: [],
              });
              processedHosts.add(hostName);
              allHostsOnSystem.add(hostName); // Ensure hosts listed in groups are known
            } else {
              parseError = `Host entry in group '${groupName}' is not a string: ${JSON.stringify(hostName)}`;
            }
          });
        }
      }
      if (parseError) return node; 

      if (groupData?.children) {
         if (!Array.isArray(groupData.children)) {
            parseError = `Group '${groupName}' has a 'children' key that is not an array.`;
        } else {
            groupData.children.forEach((childGroupName: string) => {
            if (typeof childGroupName === 'string' && jsonData[childGroupName] && !path.includes(childGroupName)) {
                node.children.push(buildNode(childGroupName, jsonData[childGroupName], [...path, childGroupName]));
            } else if (typeof childGroupName === 'string' && !jsonData[childGroupName]){
                // Child group is declared but not defined as a top-level key (potentially an error or just a leaf group)
                node.children.push({
                    id: `group:${path.join(':')}:${groupName}:child_def_missing:${childGroupName}`,
                    name: `${childGroupName}`, // Display as is, might be an implicit group
                    type: 'group',
                    children: [], 
                });
            } else if (path.includes(childGroupName)) {
                 console.warn(`Recursive group reference detected and skipped: ${childGroupName} in path ${path.join(':')}`);
                 node.children.push({
                    id: `group:${path.join(':')}:${groupName}:child_recursive:${childGroupName}`,
                    name: `${childGroupName} (recursive ref)`,
                    type: 'group',
                    children: [],
                });
            } else {
                parseError = `Child group entry '${childGroupName}' in group '${groupName}' is invalid or malformed.`;
            }
            });
        }
      }
      return node;
    };

    let rootNode: InventoryNode | null = null;
    const initialExpanded = new Set<string>();

    if (Object.keys(jsonData).length === 0) {
        return { tree: null, error: "Empty inventory: The JSON object is empty." };
    }
    
    if (jsonData.all) {
      rootNode = buildNode('all', jsonData.all, ['all']);
      if (parseError) return { tree: null, error: parseError };
      initialExpanded.add(rootNode.id);
      // Expand direct children of 'all' if they are groups
      rootNode.children.filter(c => c.type === 'group' || c.type === 'all_group').forEach(child => initialExpanded.add(child.id));
    } else {
      // Handle inventories without an explicit 'all' group by creating a synthetic root
      rootNode = { id: 'group:__synthetic_root__', name: 'Inventory (Implicit Root)', type: 'group', children: [] };
      initialExpanded.add(rootNode.id);
      Object.keys(jsonData).forEach(key => {
        if (key !== '_meta' && typeof jsonData[key] === 'object' && jsonData[key] !== null) {
          const childNode = buildNode(key, jsonData[key], [key]);
          if (parseError) { return; } // Propagate error
          rootNode!.children.push(childNode);
          if (childNode.type === 'group' || childNode.type === 'all_group') {
            initialExpanded.add(childNode.id);
          }
        } else if (key !== '_meta' && jsonData[key] === null) { // Handle top-level hosts declared with null value
            rootNode!.children.push({ id: `host:${key}`, name: key, type: 'host', children: []});
            processedHosts.add(key);
            allHostsOnSystem.add(key);
        }
      });
      if (parseError) return { tree: null, error: parseError };
    }
    
    // Consolidate ungrouped hosts
    const ungroupedHosts = new Set<string>();
    allHostsOnSystem.forEach(host => {
        if (!processedHosts.has(host)) {
            ungroupedHosts.add(host);
        }
    });
    
    // Add hosts from explicit "ungrouped" group if it exists
    if (jsonData.ungrouped?.hosts && Array.isArray(jsonData.ungrouped.hosts)) {
        jsonData.ungrouped.hosts.forEach((hostName: string) => {
            if(typeof hostName === 'string') ungroupedHosts.add(hostName);
        });
    }

    if (ungroupedHosts.size > 0 && rootNode) {
        let ungroupedGroupNode = rootNode.children.find(c => c.id === 'group:ungrouped' || (c.name === 'ungrouped' && c.type === 'group'));
        if (!ungroupedGroupNode) {
            ungroupedGroupNode = { id: 'group:ungrouped_synthetic', name: 'ungrouped', type: 'group', children: []};
            // Add to 'all' or synthetic root
            if (rootNode.id === 'group:all' || rootNode.id === 'group:__synthetic_root__') {
                rootNode.children.push(ungroupedGroupNode);
                initialExpanded.add(ungroupedGroupNode.id); 
            }
        }
         // Ensure we only add hosts not already captured elsewhere under 'ungrouped'
        ungroupedHosts.forEach(hostName => {
            if (!ungroupedGroupNode!.children.some(c => c.id === `host:${hostName}`)) {
                ungroupedGroupNode!.children.push({
                    id: `host:${hostName}`,
                    name: hostName,
                    type: 'ungrouped_host', 
                    children: [],
                });
            }
        });
    }
    
    // Final check if the tree is still effectively empty
    if (!rootNode || (rootNode.children.length === 0 && ungroupedHosts.size === 0 && Object.keys(hostVars).length === 0 && Object.keys(jsonData).filter(k => k !== '_meta').length === 0 )) {
        if (jsonData._meta && Object.keys(jsonData).length === 1 && Object.keys(hostVars).length === 0) {
             return { tree: null, error: "Empty inventory: Contains only _meta with no hostvars." };
        }
        // If only _meta.hostvars has entries, create a simple list
        if (jsonData._meta && Object.keys(hostVars).length > 0 && !jsonData.all && Object.keys(jsonData).filter(k => k !== '_meta').length === 0) {
             rootNode = { id: 'group:__synthetic_hostvars_root__', name: 'Hosts (from _meta.hostvars)', type: 'group', children: [] };
             initialExpanded.add(rootNode.id);
             Object.keys(hostVars).forEach(hostName => {
                rootNode!.children.push({ id: `host:${hostName}`, name: hostName, type: 'ungrouped_host', children: [] });
             });
        } else if (!parseError) { 
            return { tree: null, error: "Could not determine inventory structure. Ensure 'all' group or other top-level groups are defined, or _meta.hostvars is present." };
        }
    }
    
    setExpandedNodes(initialExpanded);
    return { tree: rootNode, error: parseError };
  };


  const handleVisualize = () => {
    if (!jsonInput.trim()) {
      setError("Please paste JSON output from 'ansible-inventory --list'.");
      setInventoryTree(null);
      toast({ title: "Input Error", description: "JSON input cannot be empty.", variant: "destructive" });
      return;
    }
    let data;
    try {
      data = JSON.parse(jsonInput);
    } catch (e) {
      console.error("JSON Parsing Error:", e);
      let specificErrorMessage = "Invalid JSON syntax.";
      if (e instanceof Error && e.message) {
        specificErrorMessage = `Invalid JSON syntax: ${e.message.split('\n')[0]}`;
      } else if (typeof e === 'string') {
        specificErrorMessage = `Invalid JSON syntax: ${e.split('\n')[0]}`;
      }
      setError(specificErrorMessage);
      setInventoryTree(null);
      toast({ title: "JSON Parsing Error", description: specificErrorMessage, variant: "destructive" });
      return; 
    }

    const result = parseAndBuildTree(data);

    if (result.error) {
      setError(result.error);
      setInventoryTree(null);
      toast({ title: "Inventory Structure Error", description: result.error, variant: "destructive" });
    } else if (result.tree) {
      setError(null);
      setInventoryTree(result.tree);
      toast({ title: "Inventory Visualized", description: "Inventory structure parsed and displayed.", className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300" });
    } else {
      // This case should ideally be covered by result.error from parseAndBuildTree
      const fallbackError = "Could not build inventory tree. Ensure the JSON represents a valid Ansible inventory (--list output).";
      setError(fallbackError); 
      setInventoryTree(null);
      toast({ title: "Visualization Error", description: fallbackError, variant: "destructive" });
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

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized || !dialogContentRef.current) return;
    // Prevent dragging if click target is a button or an element inside a button
    if ((e.target as HTMLElement).closest('button, [role="button"]')) return;


    setIsDragging(true);
    const rect = dialogContentRef.current.getBoundingClientRect();
    setDragStartOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.preventDefault(); 
  };

  React.useEffect(() => {
    const handleDragMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartOffset || isMaximized || !dialogContentRef.current) return;
      
      let newX = e.clientX - dragStartOffset.x;
      let newY = e.clientY - dragStartOffset.y;

      const { innerWidth, innerHeight } = window;
      const dialogRect = dialogContentRef.current.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, innerWidth - dialogRect.width));
      newY = Math.max(0, Math.min(newY, innerHeight - dialogRect.height));

      setDialogPosition({ x: newX, y: newY });
    };

    const handleDragMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMouseMove);
      document.addEventListener('mouseup', handleDragMouseUp);
      document.body.style.userSelect = 'none'; 
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMouseMove);
      document.removeEventListener('mouseup', handleDragMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStartOffset, isMaximized]);
  
  const getDialogDynamicStyles = (): React.CSSProperties => {
    if (isMaximized) {
      return {
        top: '0px',
        left: '0px',
        width: '100vw',
        height: '100vh',
        transform: 'none', 
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: '0',
      };
    }
    if (dialogPosition) {
      return {
        top: `${dialogPosition.y}px`,
        left: `${dialogPosition.x}px`,
        transform: 'none', 
      };
    }
    // Default: Centered, will be handled by Tailwind classes if no position is set
    return {}; 
  };

  const dialogBaseClasses = "fixed z-50 flex flex-col border bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg p-0";
  const dialogCenteringClasses = "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]";
  const dialogSizingClassesMaximized = "!w-screen !h-screen !max-w-none !max-h-none !rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0";
  const dialogSizingClassesDefault = "w-[90vw] h-[85vh] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]";

  let currentDialogClasses = dialogBaseClasses;
  if (isMaximized) {
    currentDialogClasses = cn(dialogBaseClasses, dialogSizingClassesMaximized);
  } else if (dialogPosition) {
    // When dragged, we use inline styles for position, so don't need centering classes
    currentDialogClasses = cn(dialogBaseClasses, dialogSizingClassesDefault); 
  } else {
    // Default, not dragged and not maximized: apply centering and default size
    currentDialogClasses = cn(dialogBaseClasses, dialogCenteringClasses, dialogSizingClassesDefault);
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Optional: clear state when dialog closes if desired
        // clearVisualization(); 
      }
      onOpenChange(open);
    }}>
      <DialogContent 
        ref={dialogContentRef}
        className={currentDialogClasses}
        style={getDialogDynamicStyles()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        // onInteractOutside={(e) => { // Might be too aggressive
        //   if (isDragging) e.preventDefault();
        // }}
      >
        <DialogHeader 
          className={cn(
            "p-4 border-b flex flex-row justify-between items-center flex-shrink-0",
            !isMaximized && "cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleDragMouseDown}
        >
          <DialogTitle className="font-headline">Visualize Inventory Structure (from ansible-inventory --list)</DialogTitle>
          <div className="flex items-center gap-1 flex-shrink-0 mr-8"> {/* Added mr-8 here */}
            <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="w-7 h-7">
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="sr-only">{isMaximized ? 'Restore' : 'Maximize'}</span>
            </Button>
           </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          <div className="w-full md:w-96 p-3 border-b md:border-b-0 md:border-r flex flex-col flex-shrink-0">
            <Label htmlFor="jsonInventoryInput" className="mb-1.5 font-medium flex-shrink-0">Paste JSON Output:</Label>
            <div className="flex-1 min-h-0 my-1.5">
                <Textarea
                    id="jsonInventoryInput"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="Paste output of 'ansible-inventory --list' here..."
                    className="resize-none text-xs font-mono h-full w-full"
                />
            </div>
            <Button onClick={handleVisualize} className="mt-auto w-full flex-shrink-0">Visualize</Button>
            {error && <p className="mt-2 text-sm text-destructive flex items-center flex-shrink-0"><AlertTriangle className="w-4 h-4 mr-1.5"/> {error}</p>}
          </div>

          <div className="flex-1 p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <Label htmlFor="zoomSlider" className="text-sm">Zoom: {zoomLevel}%</Label>
                <Button variant="outline" size="sm" onClick={clearVisualization} className="text-xs">Clear</Button>
            </div>
            <Slider
                id="zoomSlider"
                min={25}
                max={200}
                step={5}
                value={[zoomLevel]}
                onValueChange={(value) => setZoomLevel(value[0])}
                className="mb-3 flex-shrink-0"
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

        <DialogFooter className="p-4 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

