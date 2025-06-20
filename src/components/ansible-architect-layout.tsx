
"use client";
import * as React from "react";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { TaskList } from "@/components/task-list";
import { YamlDisplay, type YamlSegment } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ExternalLink, Settings, Trash2, PlusCircle, X, FilePlus, Edit2, FileCheck, Eye as EyeIcon, Copy as CopyIconLucide } from "lucide-react";
import * as yaml from "js-yaml";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybookYAML, AnsibleRoleRef, PlaybookState } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryStructureVisualizer } from "@/components/inventory-structure-visualizer";


const MIN_COLUMN_WIDTH = 150; 
const LOCAL_STORAGE_PLAYBOOKS_KEY = "ansibleArchitectPlaybooks";
const LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY = "ansibleArchitectActivePlaybookId";

function generatePlaybookYamlSegments(tasks: AnsibleTask[], playbookName: string): YamlSegment[] {
  const segments: YamlSegment[] = [];
  const playbookStructure: AnsiblePlaybookYAML = [
    {
      id: "play1", 
      name: playbookName,
      hosts: "all",
      become: true,
      tasks: tasks,
    },
  ];

  playbookStructure.forEach(play => {
    let playHeaderContent = `- name: ${play.name}\n`;
    playHeaderContent += `  hosts: ${play.hosts}\n`;
    if (play.become !== undefined) {
      playHeaderContent += `  become: ${play.become ? 'yes' : 'no'}\n`;
    }
    segments.push({ content: playHeaderContent, isTaskBlock: false });

    if (play.tasks.length > 0) {
      segments.push({ content: `  tasks:\n`, isTaskBlock: false });
      play.tasks.forEach(task => {
        let taskBlockContent = "";
        if (task.rawYAML) {
          const lines = task.rawYAML.trim().split('\n');
          lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (index === 0 && !trimmedLine.startsWith('-')) {
               taskBlockContent += `    - ${trimmedLine}\n`;
            } else if (index === 0 && trimmedLine.startsWith('-')) {
               taskBlockContent += `    ${trimmedLine}\n`;
            } else {
               taskBlockContent += `      ${trimmedLine}\n`;
            }
          });
        } else {
          taskBlockContent += `    - name: "${task.name.replace(/"/g, '\\"')}"\n`;
          if (task.comment) {
            taskBlockContent += `      # ${task.comment}\n`;
          }
          taskBlockContent += `      ${task.module}:\n`;
          Object.entries(task.parameters || {}).forEach(([key, value]) => {
            let formattedValue = value;
            if (typeof value === 'string') {
              if (value.includes('\n')) {
                formattedValue = `|-\n          ${value.split('\n').join('\n          ')}`;
              } else if (value.includes(':') || value.includes('#') || value.includes('"') || value.includes("'") || ['yes', 'no', 'true', 'false', 'on', 'off', 'null'].includes(value.toLowerCase()) || /^\d/.test(value) || value.trim() === "") {
                 formattedValue = `"${value.replace(/"/g, '\\"')}"`;
              }
            } else if (typeof value === 'boolean') {
              formattedValue = value ? 'yes' : 'no';
            } else if (value === null || value === undefined) {
              formattedValue = 'null';
            }
            taskBlockContent += `        ${key}: ${formattedValue}\n`;
          });
        }
        taskBlockContent += "\n";
        segments.push({ id: task.id, content: taskBlockContent, isTaskBlock: true });
      });
    } else {
      segments.push({ content: "  tasks: []\n\n", isTaskBlock: false });
    }
  });
  return segments;
}

const createNewPlaybook = (name?: string): PlaybookState => ({
  id: crypto.randomUUID(),
  name: name || `Untitled Playbook ${Date.now() % 10000}`,
  tasks: [],
});

interface StoppableEvent {
  stopPropagation: () => void;
  preventDefault?: () => void;
}


export function AnsibleArchitectLayout() {
  const [playbooks, setPlaybooks] = React.useState<PlaybookState[]>([]);
  const [activePlaybookId, setActivePlaybookId] = React.useState<string | null>(null);
  const [isClientReady, setIsClientReady] = React.useState(false);
  const { toast } = useToast();
  const [isDraggingOverTaskList, setIsDraggingOverTaskList] = React.useState(false);

  const [col1Width, setCol1Width] = React.useState(300); // Module Palette
  const [col2Width, setCol2Width] = React.useState(450); // Task List (within middle area)
  const [actionsPanelWidth, setActionsPanelWidth] = React.useState(256); // Actions Panel

  const [draggingResizer, setDraggingResizer] = React.useState<"col1" | "col2" | "actionsPanel" | null>(null);
  const [startX, setStartX] = React.useState(0);
  const [initialCol1W, setInitialCol1W] = React.useState(0);
  const [initialCol2W, setInitialCol2W] = React.useState(0);
  const [initialActionsPanelW, setInitialActionsPanelW] = React.useState(0);


  const [definedRoles, setDefinedRoles] = React.useState<AnsibleRoleRef[]>([]);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState("");

  const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [renamingPlaybookId, setRenamingPlaybookId] = React.useState<string | null>(null);
  const [tempPlaybookName, setTempPlaybookName] = React.useState("");
  
  const inventoryFileRef = React.useRef<HTMLInputElement>(null);
  const playbookFileRef = React.useRef<HTMLInputElement>(null);

  const [isInventoryVisualizerOpen, setIsInventoryVisualizerOpen] = React.useState(false);


  React.useEffect(() => {
    const storedPlaybooks = localStorage.getItem(LOCAL_STORAGE_PLAYBOOKS_KEY);
    const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY);
    let initialPlaybooks: PlaybookState[] = [];
    let initialActiveId: string | null = null;

    if (storedPlaybooks) {
      try {
        const parsedPlaybooks = JSON.parse(storedPlaybooks) as PlaybookState[];
        if (Array.isArray(parsedPlaybooks) && parsedPlaybooks.length > 0) {
          initialPlaybooks = parsedPlaybooks;
          if (storedActiveId && parsedPlaybooks.some((p: PlaybookState) => p.id === storedActiveId)) {
            initialActiveId = storedActiveId;
          } else {
            initialActiveId = parsedPlaybooks[0].id;
          }
        }
      } catch (error) {
        console.error("Error parsing playbooks from localStorage:", error);
      }
    }

    if (initialPlaybooks.length === 0) {
      const defaultPlaybook = createNewPlaybook("Default Playbook");
      initialPlaybooks = [defaultPlaybook];
      initialActiveId = defaultPlaybook.id;
    }

    setPlaybooks(initialPlaybooks);
    setActivePlaybookId(initialActiveId);
    setIsClientReady(true); 
  }, []);

  React.useEffect(() => {
    if (!isClientReady) return;

    if (playbooks.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_PLAYBOOKS_KEY, JSON.stringify(playbooks));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_PLAYBOOKS_KEY);
    }
    if (activePlaybookId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY, activePlaybookId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY);
    }
  }, [playbooks, activePlaybookId, isClientReady]);

  const getActivePlaybook = React.useCallback(() => {
    return playbooks.find(p => p.id === activePlaybookId);
  }, [playbooks, activePlaybookId]);

  const updateActivePlaybookState = React.useCallback((updatedFields: Partial<PlaybookState>) => {
    setPlaybooks(prev =>
      prev.map(p => (p.id === activePlaybookId ? { ...p, ...updatedFields } : p))
    );
  }, [activePlaybookId]);


  const activePlaybook = getActivePlaybook();
  const yamlSegments = React.useMemo(() => {
    if (!activePlaybook) return [];
    return generatePlaybookYamlSegments(activePlaybook.tasks, activePlaybook.name);
  }, [activePlaybook]);

  const fullYamlContent = React.useMemo(() => yamlSegments.map(segment => segment.content).join(''), [yamlSegments]);

  const addTaskToActivePlaybook = (taskDetails: AnsibleModuleDefinition | AnsibleTask) => {
    const currentActivePlaybook = playbooks.find(p => p.id === activePlaybookId);
    if (!currentActivePlaybook) return; 
    let newTask: AnsibleTask;
    if ('module' in taskDetails && 'defaultParameters' in taskDetails) {
      const moduleDef = taskDetails as AnsibleModuleDefinition;
      newTask = {
        id: crypto.randomUUID(),
        name: `New ${moduleDef.name} Task`,
        module: moduleDef.module,
        parameters: JSON.parse(JSON.stringify(moduleDef.defaultParameters || {})),
      };
    } else {
      newTask = taskDetails as AnsibleTask;
      if (!newTask.id) newTask.id = crypto.randomUUID();
    }
    updateActivePlaybookState({ tasks: [...currentActivePlaybook.tasks, newTask] });
  };

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
    addTaskToActivePlaybook(moduleDef);
  };

  const updateTaskInActivePlaybook = (updatedTask: AnsibleTask) => {
    const currentActivePlaybook = playbooks.find(p => p.id === activePlaybookId);
    if (!currentActivePlaybook) return; 
    updateActivePlaybookState({
      tasks: currentActivePlaybook.tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)),
    });
  };

  const deleteTaskInActivePlaybook = (taskId: string) => {
    const currentActivePlaybook = playbooks.find(p => p.id === activePlaybookId);
    if (!currentActivePlaybook) return; 
    updateActivePlaybookState({
      tasks: currentActivePlaybook.tasks.filter(task => task.id !== taskId),
    });
  };

  const moveTaskInActivePlaybook = (dragIndex: number, hoverIndex: number) => {
    const currentActivePlaybook = playbooks.find(p => p.id === activePlaybookId);
    if (!currentActivePlaybook) return; 
    const newTasks = [...currentActivePlaybook.tasks];
    const [draggedItem] = newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedItem);
    updateActivePlaybookState({ tasks: newTasks });
  };

  const handleExportYaml = () => {
    if (!fullYamlContent) { 
      toast({ title: "Error", description: "No YAML content to export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([fullYamlContent], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const currentActivePlaybook = getActivePlaybook();
    link.download = `${currentActivePlaybook?.name.replace(/\s+/g, '_') || 'playbook'}.yml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Exported", description: "Playbook YAML downloaded." });
  };

  const handleCopyYaml = async () => {
    if (!fullYamlContent || fullYamlContent.trim() === "" || fullYamlContent.trim() === "# Add tasks to see YAML output here") { 
      toast({ title: "Nothing to Copy", description: "Generated YAML is empty.", variant: "default" });
      return;
    }
    try {
      await navigator.clipboard.writeText(fullYamlContent);
      toast({ title: "Copied", description: "YAML copied to clipboard." });
    } catch (err) {
      console.error("Failed to copy YAML: ", err);
      toast({ title: "Error", description: "Failed to copy YAML to clipboard.", variant: "destructive" });
    }
  };

  const handleValidatePlaybookClick = () => {
     playbookFileRef.current?.click();
  };

  const handlePlaybookFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        toast({ title: "Error", description: `Could not read file: ${file.name}`, variant: "destructive" });
        return;
      }

      try {
        const playbook = yaml.load(content);
        let validationMessage = `YAML syntax for "${file.name}" is valid.`;
        let hasSemanticIssues = false;
        const semanticErrors: string[] = [];
        const semanticWarnings: string[] = [];

        if (!Array.isArray(playbook)) {
          semanticErrors.push("Playbook must be a list of plays (e.g., starts with '-').");
          hasSemanticIssues = true;
        } else {
          (playbook as any[]).forEach((play, playIndex) => {
            if (typeof play !== 'object' || play === null) {
              semanticErrors.push(`Play ${playIndex + 1} is not a valid object.`);
              hasSemanticIssues = true;
              return; 
            }

            if (!play.hosts || typeof play.hosts !== 'string') {
              semanticErrors.push(`Play ${playIndex + 1} (name: "${play.name || 'Unnamed'}") is missing a 'hosts' key or its value is not a string.`);
              hasSemanticIssues = true;
            }
            if (play.name && typeof play.name !== 'string') {
              semanticWarnings.push(`Play ${playIndex + 1} has a 'name' key, but its value is not a string.`);
            }
            if (play.become !== undefined && typeof play.become !== 'boolean') {
              semanticWarnings.push(`Play ${playIndex + 1} (name: "${play.name || 'Unnamed'}") has a 'become' key, but its value is not a boolean (true/false).`);
            }

            if (play.tasks) {
              if (!Array.isArray(play.tasks)) {
                semanticErrors.push(`Play ${playIndex + 1} (name: "${play.name || 'Unnamed'}") has a 'tasks' key, but its value is not a list.`);
                hasSemanticIssues = true;
              } else {
                (play.tasks as any[]).forEach((task, taskIndex) => {
                  if (typeof task !== 'object' || task === null) {
                    semanticErrors.push(`Task ${taskIndex + 1} in Play ${playIndex + 1} is not a valid object.`);
                    hasSemanticIssues = true;
                    return; 
                  }
                  
                  const taskKeys = Object.keys(task);
                  const knownTaskKeywords = ['name', 'when', 'loop', 'register', 'tags', 'become', 'vars', 'include_role', 'import_role', 'block', 'rescue', 'always', 'delegate_to', 'run_once', 'ignore_errors', 'changed_when', 'failed_when', 'notify', 'listen', 'environment', 'args', 'no_log', 'loop_control', 'until', 'retries', 'delay', 'async', 'poll', 'check_mode', 'diff', 'debugger', 'collections', 'module_defaults'];
                  const moduleKeys = taskKeys.filter(k => !knownTaskKeywords.includes(k));

                  if (moduleKeys.length === 0 && !task.block && !task.include_role && !task.import_role) { 
                     semanticWarnings.push(`Task ${taskIndex + 1} (name: "${task.name || 'Unnamed'}") in Play ${playIndex + 1} does not seem to call a module, include a role, or define a block.`);
                  } else if (moduleKeys.length === 1) {
                    const moduleKey = moduleKeys[0];
                    const moduleParams = task[moduleKey];
                    if (typeof moduleParams !== 'object' && typeof moduleParams !== 'string' && moduleParams !== null) {
                       semanticWarnings.push(`Task ${taskIndex + 1} (name: "${task.name || 'Unnamed'}") in Play ${playIndex + 1} module '${moduleKey}' has parameters that are not an object or string.`);
                    }
                  } else if (moduleKeys.length > 1) {
                     semanticWarnings.push(`Task ${taskIndex + 1} (name: "${task.name || 'Unnamed'}") in Play ${playIndex + 1} appears to call multiple modules: ${moduleKeys.join(', ')}.`);
                  }
                });
              }
            }
          });
        }
        
        if (hasSemanticIssues) {
           toast({
            title: "Playbook Validation Failed (Semantic)",
            description: `Error in "${file.name}": ${semanticErrors.join("; ")}. ${semanticWarnings.join("; ")}`,
            variant: "destructive",
          });
        } else if (semanticWarnings.length > 0) {
          toast({
            title: "Playbook Validation Successful (with warnings)",
            description: `${validationMessage} Warnings: ${semanticWarnings.join("; ")}`,
            variant: "default",
            className: "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
          });
        } else {
          toast({
            title: "Playbook Validation Successful",
            description: `${validationMessage} Basic playbook structure appears valid.`,
            className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
          });
        }

      } catch (error) {
        let errorMessage = "Invalid YAML syntax.";
        if (error instanceof yaml.YAMLException) {
          errorMessage = `Invalid YAML syntax: ${error.message.split('\n')[0]}`;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast({
          title: "Playbook Validation Failed (Syntax)",
          description: `Error in "${file.name}" (YAML): ${errorMessage}. See console for details.`,
          variant: "destructive",
        });
        console.error(`Playbook YAML Validation Error (${file.name}):`, error);
      }
    };
    reader.onerror = () => {
      toast({ title: "Error", description: `Error reading file: ${file.name}`, variant: "destructive" });
    };
    reader.readAsText(file);

    if (playbookFileRef.current) {
      playbookFileRef.current.value = "";
    }
  };

  const handleDropOnTaskList = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverTaskList(false);
    if (!activePlaybookId) { 
      toast({ title: "Error", description: "No active playbook to add tasks to.", variant: "destructive" });
      return;
    }
    try {
      const moduleDataString = event.dataTransfer.getData("application/json");
      if (moduleDataString) {
        const moduleDefinition: AnsibleModuleDefinition = JSON.parse(moduleDataString);
        addTaskToActivePlaybook(moduleDefinition);
      }
    } catch (error) {
      console.error("Error parsing dropped data:", error);
      toast({ title: "Error", description: "Could not add module from drag-and-drop.", variant: "destructive" });
    }
  };

  const handleDragOverTaskList = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDraggingOverTaskList) setIsDraggingOverTaskList(true);
  };

  const handleDragLeaveTaskList = () => {
    setIsDraggingOverTaskList(false);
  };

  const handleMouseDown = (resizerId: "col1" | "col2" | "actionsPanel", event: React.MouseEvent) => {
    event.preventDefault();
    setDraggingResizer(resizerId);
    setStartX(event.clientX);
    setInitialCol1W(col1Width);
    setInitialCol2W(col2Width);
    setInitialActionsPanelW(actionsPanelWidth);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (!draggingResizer) return;
    const deltaX = event.clientX - startX;
    if (draggingResizer === "col1") {
      const newW1 = initialCol1W + deltaX;
      setCol1Width(Math.max(MIN_COLUMN_WIDTH, newW1));
    } else if (draggingResizer === "col2") {
      const newW2 = initialCol2W + deltaX;
      setCol2Width(Math.max(MIN_COLUMN_WIDTH, newW2));
    } else if (draggingResizer === "actionsPanel") {
      const newAPW = initialActionsPanelW - deltaX; // Dragging right decreases right panel width
      setActionsPanelWidth(Math.max(MIN_COLUMN_WIDTH, newAPW));
    }
  }, [draggingResizer, startX, initialCol1W, initialCol2W, initialActionsPanelW]);

  const handleMouseUp = React.useCallback(() => {
    setDraggingResizer(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    if (draggingResizer) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingResizer, handleMouseMove, handleMouseUp]);

  const Resizer = ({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) => (
    <div
      onMouseDown={onMouseDown}
      className="w-2 h-full cursor-col-resize bg-border hover:bg-primary/20 transition-colors flex-shrink-0"
      role="separator"
      aria-label="Resize column"
    />
  );

  const handleAddDefinedRole = () => {
    if (newRoleName.trim() === "") {
      toast({ title: "Error", description: "Role name cannot be empty.", variant: "destructive" });
      return;
    }
    if (definedRoles.some(role => role.name === newRoleName.trim())) {
      toast({ title: "Error", description: "A role with this name already exists.", variant: "destructive" });
      return;
    }
    setDefinedRoles(prev => [...prev, { id: crypto.randomUUID(), name: newRoleName.trim() }]);
    setNewRoleName("");
    toast({ title: "Success", description: `Role "${newRoleName.trim()}" added.` });
  };

  const handleDeleteDefinedRole = (roleId: string) => {
    const roleToDelete = definedRoles.find(r => r.id === roleId);
    setDefinedRoles(prev => prev.filter(role => role.id !== roleId));
    if (roleToDelete) {
      toast({ title: "Success", description: `Role "${roleToDelete.name}" deleted.`, variant: "default" });
    }
  };

  const handleNewPlaybook = () => {
    const newPBook = createNewPlaybook();
    setPlaybooks(prev => [...prev, newPBook]);
    setActivePlaybookId(newPBook.id);
    toast({ title: "New Playbook", description: `"${newPBook.name}" created and activated.`});
  };

  const handleClosePlaybook = (playbookIdToClose: string, event: StoppableEvent | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const playbookToClose = playbooks.find(p => p.id === playbookIdToClose);

    setPlaybooks(prev => {
      const remainingPlaybooks = prev.filter(p => p.id !== playbookIdToClose);
      if (remainingPlaybooks.length === 0) {
        const newDefault = createNewPlaybook("Default Playbook");
        setActivePlaybookId(newDefault.id);
        return [newDefault];
      }
      if (activePlaybookId === playbookIdToClose) {
        const closedTabIndex = prev.findIndex(p => p.id === playbookIdToClose);
        let newActiveId = remainingPlaybooks[0].id;
        if (closedTabIndex > 0 && closedTabIndex <= remainingPlaybooks.length) {
            const potentialPrevPlaybook = prev[closedTabIndex -1];
            if (remainingPlaybooks.some(r => r.id === potentialPrevPlaybook.id)) {
                newActiveId = potentialPrevPlaybook.id;
            }
        }
        setActivePlaybookId(newActiveId);
      }
      return remainingPlaybooks;
    });
    if (playbookToClose) {
        toast({ title: "Playbook Closed", description: `"${playbookToClose.name}" closed.`});
    }
  };

  const openRenameModal = (playbookId: string, currentName: string, event: StoppableEvent | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    setRenamingPlaybookId(playbookId);
    setTempPlaybookName(currentName);
    setIsRenameModalOpen(true);
  };

  const handleRenamePlaybook = () => {
    if (!renamingPlaybookId || tempPlaybookName.trim() === "") { 
      toast({title: "Error", description: "Playbook name cannot be empty.", variant: "destructive"});
      return;
    }
    setPlaybooks(prev => prev.map(p => p.id === renamingPlaybookId ? {...p, name: tempPlaybookName.trim()} : p));
    toast({title: "Playbook Renamed", description: `Playbook renamed to "${tempPlaybookName.trim()}".`});
    setIsRenameModalOpen(false);
    setRenamingPlaybookId(null);
    setTempPlaybookName("");
  };

  const validateIniInventoryContent = (content: string, fileName: string) => {
    const lines = content.split(/\r?\n/);
    let currentGroup: string | null = null;
    let isVarsSection = false;
    let isChildrenSection = false;
    const groups: Record<string, string[]> = {};
    let hostCount = 0;
    let errorLine = -1;
    let errorMessage = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "" || line.startsWith("#") || line.startsWith(";")) {
            continue; 
        }

        if (line.startsWith("[") && line.endsWith("]")) {
            const groupNameRaw = line.substring(1, line.length - 1).trim();
            if (!groupNameRaw || groupNameRaw.includes("[") || groupNameRaw.includes("]")) {
                errorLine = i + 1;
                errorMessage = `Malformed group header: ${line}`;
                break;
            }
            
            isVarsSection = groupNameRaw.endsWith(":vars");
            isChildrenSection = groupNameRaw.endsWith(":children");
            currentGroup = groupNameRaw;
            
            if (!groups[currentGroup]) groups[currentGroup] = [];

        } else if (currentGroup) {
            const parts = line.split(/\s+/);
            const firstWord = parts[0];

            if (isVarsSection) {
                if (!line.includes("=")) {
                    errorLine = i + 1;
                    errorMessage = `Non-variable line "${line}" found in :vars section "${currentGroup}". Variable lines must be in 'key=value' format.`;
                    break;
                }
                if (!/^\s*\S+\s*=\s*\S+/.test(line.replace(/\s*#.*$/, ""))) { 
                    errorLine = i + 1;
                    errorMessage = `Malformed variable definition: "${line}" in :vars section "${currentGroup}". Expected 'key=value'.`;
                    break;
                }
                groups[currentGroup].push(line);
            } else if (isChildrenSection) {
                if (line.includes("=") || line.includes(" ")) { 
                    errorLine = i + 1;
                    errorMessage = `Invalid entry in :children section "${currentGroup}": "${line}". Child group names should be single words without variables.`;
                    break;
                }
                if (!/^[a-zA-Z0-9_.-]+$/.test(firstWord)) {
                    errorLine = i + 1;
                    errorMessage = `Invalid characters in child group name: "${firstWord}" from line "${line}" in section "${currentGroup}".`;
                    break;
                }
                groups[currentGroup].push(firstWord);
            } else { 
                if (!firstWord) {
                    errorLine = i + 1;
                    errorMessage = `Empty host entry in group "${currentGroup}".`;
                    break;
                }
                if (!/^[a-zA-Z0-9_.-]+/.test(firstWord.split('=')[0].trim())) { 
                    errorLine = i + 1;
                    errorMessage = `Potentially invalid characters in host name: "${firstWord.split('=')[0].trim()}" from line "${line}" in group "${currentGroup}".`;
                    break;
                }
                groups[currentGroup].push(firstWord); 
                hostCount++;
            }
        } else { 
             const parts = line.split(/\s+/);
             const firstWord = parts[0];
             if (firstWord && /^[a-zA-Z0-9_.-]+/.test(firstWord.split('=')[0].trim())) {
                hostCount++;
             } else {
                errorLine = i + 1;
                errorMessage = `Unexpected line format or entry outside a group: ${line}`;
                break;
             }
        }
    }

    if (errorLine !== -1) {
        toast({
            title: "INI Inventory Validation Failed",
            description: `Error in "${fileName}" on line ${errorLine}: ${errorMessage}`,
            variant: "destructive",
        });
    } else {
        const groupCount = Object.keys(groups).filter(g => !g.endsWith(":vars") && !g.endsWith(":children")).length;
        const childrenGroupCount = Object.keys(groups).filter(g => g.endsWith(":children")).length;
        const varsGroupCount = Object.keys(groups).filter(g => g.endsWith(":vars")).length;

        let summary = `File "${fileName}" (INI) basic structure appears valid. `;
        summary += `Found ${groupCount} explicit group(s), ${hostCount} host(s) (including ungrouped). `;
        if (childrenGroupCount > 0) summary += `${childrenGroupCount} children definition(s). `;
        if (varsGroupCount > 0) summary += `${varsGroupCount} group vars definition(s).`;

        toast({
            title: "INI Inventory Validation Successful",
            description: summary.trim(),
            className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
        });
    }
  };

  const validateYamlInventoryContent = (content: string, fileName: string) => {
    try {
        const inventory = yaml.load(content);
        if (typeof inventory !== 'object' || inventory === null) {
            toast({
                title: "YAML Inventory Validation Failed",
                description: `File "${fileName}" (YAML) root must be an object/dictionary.`,
                variant: "destructive",
            });
            return;
        }

        let hostCount = 0;
        let topLevelGroupCount = 0;
        const warnings: string[] = [];
        const errors: string[] = [];
        const processedHosts = new Set<string>();

        function processGroup(groupName: string, groupData: any, path: string) {
            if (typeof groupData !== 'object' || groupData === null) {
                errors.push(`Group '${path}' is not a valid object.`);
                return;
            }
            
            if (groupName === 'all' && groupData.hosts && typeof groupData.hosts === 'object' && groupData.hosts !== null) {

                 // Count hosts directly under 'all' group if they are defined there
                Object.keys(groupData.hosts).forEach(hostName => {
                    hostCount++;
                    if (groupData.hosts[hostName] !== null && (typeof groupData.hosts[hostName] !== 'object' || Array.isArray(groupData.hosts[hostName]))) {

                       warnings.push(`Variables for host '${hostName}' in group '${path}' should be an object (dictionary) or null.`);
                    }
                });
            }


            if (groupData.hosts) {
                if (typeof groupData.hosts !== 'object' || groupData.hosts === null || Array.isArray(groupData.hosts)) {
                    errors.push(`'hosts' key in group '${path}' must be an object (dictionary).`);
                } else {

                     if (groupName !== 'all') { // Avoid double counting hosts if also under 'all'
                        hostCount += Object.keys(groupData.hosts).length;
                     }

                    for (const hostName in groupData.hosts) {
                        processedHosts.add(hostName);
                        if (groupData.hosts[hostName] !== null && (typeof groupData.hosts[hostName] !== 'object' || Array.isArray(groupData.hosts[hostName]))) {
                           warnings.push(`Variables for host '${hostName}' in group '${path}' should be an object (dictionary) or null.`);
                        }
                    }
                }
            }

            if (groupData.vars) {
                if (typeof groupData.vars !== 'object' || groupData.vars === null || Array.isArray(groupData.vars)) {
                    errors.push(`'vars' key in group '${path}' must be an object (dictionary).`);
                }
            }

            if (groupData.children) {
                if (typeof groupData.children !== 'object' || groupData.children === null || Array.isArray(groupData.children)) {
                    errors.push(`'children' key in group '${path}' must be an object (dictionary).`);
                } else {
                    for (const childGroupName in groupData.children) {
                        processGroup(childGroupName, groupData.children[childGroupName], `${path}.children.${childGroupName}`);
                    }
                }
            }
        }
        
        const parsedInventory = inventory as Record<string, any>;
        for (const groupName in parsedInventory) {
             if (groupName.startsWith('_') && groupName !== '_meta') { 
                continue;
             }
             topLevelGroupCount++;
             processGroup(groupName, parsedInventory[groupName], groupName);
        }

        hostCount = processedHosts.size;
        
        if (errors.length > 0) {
             toast({
                title: "YAML Inventory Validation Failed",
                description: `File "${fileName}" (YAML) has structural errors: ${errors.join("; ")}`,
                variant: "destructive",
            });
        } else {
            let summary = `File "${fileName}" (YAML) syntax is valid. `;
            summary += `Found ${topLevelGroupCount} top-level group(s) and ${hostCount} unique host(s).`;
            if (warnings.length > 0) {
                 summary += ` Warnings: ${warnings.join("; ")}`;
                 toast({
                    title: "YAML Inventory Validation Successful (with warnings)",
                    description: summary,
                    variant: "default",
                    className: "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
                });
            } else {
                 toast({
                    title: "YAML Inventory Validation Successful",
                    description: summary,
                    className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
                });
            }
        }

    } catch (error) {
        let errorMessage = "Invalid YAML syntax.";
        if (error instanceof yaml.YAMLException) {
            errorMessage = `Invalid YAML syntax: ${error.message.split('\n')[0]}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        toast({
            title: "YAML Inventory Validation Failed",
            description: `Error in "${fileName}" (YAML): ${errorMessage}`,
            variant: "destructive",
        });
        console.error("YAML Inventory Validation Error:", error);
    }
  };

  const validateJsonInventoryContent = (content: string, fileName: string) => {
    try {
      const inventory = JSON.parse(content);
      if (typeof inventory !== 'object' || inventory === null || Array.isArray(inventory)) {
        toast({
          title: "JSON Inventory Validation Failed",
          description: `File "${fileName}" (JSON) root must be an object.`,
          variant: "destructive",
        });
        return;
      }

      let hostCount = 0;
      let groupCount = 0;
      const warnings: string[] = [];
      const errors: string[] = [];
      const processedHosts = new Set<string>();

      if (inventory._meta) {
        if (typeof inventory._meta !== 'object' || inventory._meta === null || Array.isArray(inventory._meta)) {
          errors.push("'_meta' key must be an object.");
        } else if (inventory._meta.hostvars) {
          if (typeof inventory._meta.hostvars !== 'object' || inventory._meta.hostvars === null || Array.isArray(inventory._meta.hostvars)) {
            errors.push("'_meta.hostvars' must be an object.");
          } else {
            for (const hostName in inventory._meta.hostvars) {
              processedHosts.add(hostName);
              if (inventory._meta.hostvars[hostName] !== null && (typeof inventory._meta.hostvars[hostName] !== 'object' || Array.isArray(inventory._meta.hostvars[hostName]))) {
                warnings.push(`Host variables for '${hostName}' in _meta.hostvars should be an object or null.`);
              }
            }
          }
        }
      }
      
      for (const groupName in inventory) {
        if (groupName === "_meta") continue;

        groupCount++;
        const groupData = inventory[groupName];

        if (typeof groupData !== 'object' || groupData === null || Array.isArray(groupData)) {
          errors.push(`Group '${groupName}' must be an object.`);
          continue;
        }

        if (groupData.hosts) {
          if (!Array.isArray(groupData.hosts)) {
            errors.push(`'hosts' key in group '${groupName}' must be an array.`);
          } else {
            groupData.hosts.forEach((host: any) => {
              if (typeof host !== 'string') {
                warnings.push(`Host entry in group '${groupName}' is not a string: ${JSON.stringify(host)}.`);
              } else {
                processedHosts.add(host);
              }
            });
          }
        }

        if (groupData.children) {
          if (!Array.isArray(groupData.children)) {
            errors.push(`'children' key in group '${groupName}' must be an array.`);
          } else {
            groupData.children.forEach((childGroup: any) => {
              if (typeof childGroup !== 'string') {
                warnings.push(`Child group entry in group '${groupName}' is not a string: ${JSON.stringify(childGroup)}.`);
              }
            });
          }
        }
        
        if (groupData.vars) {
          if (typeof groupData.vars !== 'object' || groupData.vars === null || Array.isArray(groupData.vars)) {
            errors.push(`'vars' key in group '${groupName}' must be an object.`);
          }
        }
      }
      hostCount = processedHosts.size;


      if (errors.length > 0) {
        toast({
          title: "JSON Inventory Validation Failed",
          description: `File "${fileName}" (JSON) has structural errors: ${errors.join("; ")}`,
          variant: "destructive",
        });
      } else {
        let summary = `File "${fileName}" (JSON) syntax is valid. `;
        summary += `Found ${groupCount} group(s) and ${hostCount} unique host(s).`;
        if (inventory._meta?.hostvars) {
            summary += ` Contains '_meta.hostvars'.`;
        }
        if (warnings.length > 0) {
          summary += ` Warnings: ${warnings.join("; ")}`;
          toast({
            title: "JSON Inventory Validation Successful (with warnings)",
            description: summary,
            variant: "default",
            className: "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
          });
        } else {
          toast({
            title: "JSON Inventory Validation Successful",
            description: summary,
            className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
          });
        }
      }

    } catch (error) {
      let errorMessage = "Invalid JSON syntax.";
      if (error instanceof SyntaxError) {
        errorMessage = `Invalid JSON syntax: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "JSON Inventory Validation Failed",
        description: `Error in "${fileName}" (JSON): ${errorMessage}`,
        variant: "destructive",
      });
      console.error("JSON Inventory Validation Error:", error);
    }
  };


  const handleInventoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const fileNameLower = file.name.toLowerCase();
        if (fileNameLower.endsWith(".yaml") || fileNameLower.endsWith(".yml")) {
          validateYamlInventoryContent(content, file.name);
        } else if (fileNameLower.endsWith(".json")) {
          validateJsonInventoryContent(content, file.name);
        } else if (fileNameLower.endsWith(".ini") || file.type === "text/plain" || fileNameLower.includes("hosts")) { 
          validateIniInventoryContent(content, file.name);
        } else {
            toast({
                title: "Unknown File Type",
                description: `Cannot determine inventory type for "${file.name}". Please use .ini, .yaml, .yml, or .json extensions, or a file named 'hosts'.`,
                variant: "default",
            });
        }
      } else {
        toast({ title: "Error", description: `Could not read file: ${file.name}`, variant: "destructive" });
      }
    };
    reader.onerror = () => {
      toast({ title: "Error", description: `Error reading file: ${file.name}`, variant: "destructive" });
    };
    reader.readAsText(file);

    if (inventoryFileRef.current) {
      inventoryFileRef.current.value = "";
    }
  };

  if (!isClientReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center">
          <AnsibleArchitectIcon className="w-16 h-16 text-primary mb-4 animate-pulse" />
          <p className="text-lg font-semibold">Loading Ansible Architect...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-background p-4 space-x-0"> {/* space-x-0 to rely on resizers for spacing */}
      <div
        style={{ flex: `0 0 ${col1Width}px` }}
        className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden"
      >
        <div className="p-3 flex items-center border-b flex-shrink-0">
          <AnsibleArchitectIcon className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-lg font-bold font-headline text-primary">Ansible Architect</h1>
        </div>
        <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
      </div>

      <Resizer onMouseDown={(e) => handleMouseDown("col1", e)} />

      <div className="flex flex-col flex-1 min-w-0 min-h-0 relative"> {/* Wrapper for Tabs area */}
        <Tabs
          value={activePlaybookId || ""}
          onValueChange={setActivePlaybookId}
          className="flex flex-col flex-1 min-w-0 min-h-0" 
        >
          <div className="flex items-center border-b bg-card rounded-t-lg">
            <TabsList className="bg-card p-1 h-auto rounded-t-lg rounded-b-none">
              {playbooks.map(p => (
                <TabsTrigger
                  key={p.id}
                  value={p.id}
                  className="text-xs px-2 py-1.5 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative group"
                >
                  <span className="max-w-[120px] truncate" title={p.name}>{p.name}</span>
                  <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 ml-1.5 opacity-50 group-hover:opacity-100 hover:bg-accent/20"
                      aria-label="Rename playbook"
                    >
                      <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => openRenameModal(p.id, p.name, e)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRenameModal(p.id, p.name, e); }}}
                      >
                        <Edit2 className="w-3 h-3" />
                      </span>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 ml-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20"
                      aria-label="Close playbook"
                    >
                      <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleClosePlaybook(p.id, e)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClosePlaybook(p.id, e); }}}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </Button>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="ghost" size="icon" className="ml-1 w-7 h-7" onClick={handleNewPlaybook} aria-label="New Playbook">
              <FilePlus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-grow min-h-0 relative rounded-b-lg overflow-hidden bg-card">
              {playbooks.map(p => (
              <TabsContent
                  key={p.id}
                  value={p.id}
                  className="absolute inset-0 flex data-[state=inactive]:hidden mt-0"
              >
                  <div
                  style={{ flex: `0 0 ${col2Width}px` }}
                  onDrop={handleDropOnTaskList}
                  onDragOver={handleDragOverTaskList}
                  onDragLeave={handleDragLeaveTaskList}
                  className={`min-w-0 bg-card shadow-sm flex flex-col overflow-hidden transition-colors ${isDraggingOverTaskList ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'} border-r`} 
                  aria-dropeffect="copy"
                  >
                    <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Playbook Tasks</h2>
                    <div className="flex-grow overflow-hidden p-3">
                        <TaskList
                        tasks={p.tasks}
                        onUpdateTask={updateTaskInActivePlaybook}
                        onDeleteTask={deleteTaskInActivePlaybook}
                        onMoveTask={moveTaskInActivePlaybook}
                        definedRoles={definedRoles}
                        hoveredTaskId={p.id === activePlaybookId ? hoveredTaskId : null}
                        onSetHoveredTaskId={setHoveredTaskId}
                        />
                    </div>
                  </div>

                  <Resizer onMouseDown={(e) => handleMouseDown("col2", e)} />

                  <div
                    style={{ flex: '1 1 0%' }}
                    className="min-w-0 bg-card shadow-sm flex flex-col overflow-hidden"
                  >
                    <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Generated YAML ({p.name})</h2>
                    <div className="flex-grow overflow-hidden">
                        <YamlDisplay
                        yamlSegments={p.id === activePlaybookId ? yamlSegments : generatePlaybookYamlSegments(p.tasks, p.name)}
                        hoveredTaskId={p.id === activePlaybookId ? hoveredTaskId : null}
                        onSetHoveredSegmentId={setHoveredTaskId}
                        />
                    </div>
                  </div>
              </TabsContent>
              ))}
          </div>
        </Tabs>
      </div>

      <Resizer onMouseDown={(e) => handleMouseDown("actionsPanel", e)} />

      <div 
        style={{ flex: `0 0 ${actionsPanelWidth}px` }}
        className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden"
      >
        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Actions</h2>
        <div className="p-3 space-y-2">
          <Button onClick={handleNewPlaybook} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <FilePlus className="w-3.5 h-3.5 mr-1.5" /> New Playbook
          </Button>
          <Separator className="my-2"/>
          <Button onClick={handleValidatePlaybookClick} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Validate Playbook
          </Button>
          <input
            type="file"
            ref={playbookFileRef}
            onChange={handlePlaybookFileChange}
            accept=".yaml,.yml"
            className="hidden"
          />
          <Button onClick={handleExportYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export YAML
          </Button>
          <Button onClick={handleCopyYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <CopyIconLucide className="w-3.5 h-3.5 mr-1.5" />
            Copy YAML
          </Button>
          <Separator className="my-2"/>
          <Button onClick={() => inventoryFileRef.current?.click()} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Validate Inventory
          </Button>
          <input
            type="file"
            ref={inventoryFileRef}
            onChange={handleInventoryFileChange}
            accept=".ini,.yaml,.yml,.json,text/plain,inventory/*,hosts"
            className="hidden"
          />
           <Button onClick={() => setIsInventoryVisualizerOpen(true)} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <EyeIcon className="w-3.5 h-3.5 mr-1.5" /> Visualize Inventory Graph
          </Button>
          <Separator className="my-2"/>
           <Button onClick={() => setIsManageRolesModalOpen(true)} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage Roles
          </Button>
          <Separator className="my-2"/>
          <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary justify-start">
            <a href="https://galaxy.ansible.com/ui/collections/" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Browse Ansible Galaxy
            </a>
          </Button>
           <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary justify-start">
            <a href="https://docs.ansible.com/ansible/latest/os_guide/intro_windows.html" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Manage Windows with Ansible
            </a>
          </Button>
          <Separator className="my-2"/>
        </div>
      </div>

      <Dialog open={isManageRolesModalOpen} onOpenChange={setIsManageRolesModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Manage Defined Roles</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRoleNameInput">New Role Name</Label>
              <div className="flex space-x-2">
                <Input
                  id="newRoleNameInput"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., webserver_setup"
                  className="text-sm"
                />
                <Button onClick={handleAddDefinedRole} size="sm">
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Add Role
                </Button>
              </div>
            </div>
            <Separator />
            {definedRoles.length > 0 ? (
              <div className="space-y-2">
                <Label>Existing Roles</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {definedRoles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded-md">
                      <span className="text-sm">{role.name}</span>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleDeleteDefinedRole(role.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No roles defined yet.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Rename Playbook</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="playbookNameInput">Playbook Name</Label>
            <Input
              id="playbookNameInput"
              value={tempPlaybookName}
              onChange={(e) => setTempPlaybookName(e.target.value)}
              className="mt-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleRenamePlaybook()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRenamePlaybook}>Save Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isClientReady && isInventoryVisualizerOpen && (
        <InventoryStructureVisualizer
          isOpen={isInventoryVisualizerOpen}
          onOpenChange={setIsInventoryVisualizerOpen}
        />
      )}
    </div>
  );
}

