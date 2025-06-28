
"use client";
import * as React from "react";
import dynamic from 'next/dynamic';
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { ProjectExplorer } from "@/components/project-explorer";
import { TaskList } from "@/components/task-list";
import { YamlDisplay, type YamlSegment } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ExternalLink, Settings, Trash2, PlusCircle, X, FilePlus, Edit2, FileCheck, Eye as EyeIcon, Copy as CopyIconLucide, Archive, UploadCloud, Check } from "lucide-react";
import * as yaml from "js-yaml";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybookYAML, AnsibleRoleRef, PlaybookState, Project, ProjectFile } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from 'uuid';
import JSZip from "jszip";
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

const InventoryStructureVisualizer = dynamic(() => import('@/components/inventory-structure-visualizer').then(mod => mod.InventoryStructureVisualizer), {
  ssr: false,
});


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
  id: uuidv4(),
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

  const [col1Width, setCol1Width] = React.useState(300);
  const [col2Width, setCol2Width] = React.useState(450);
  const [actionsPanelWidth, setActionsPanelWidth] = React.useState(256);

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
  const projectZipRef = React.useRef<HTMLInputElement>(null);

  const [isInventoryVisualizerOpen, setIsInventoryVisualizerOpen] = React.useState(false);

  // Project state
  const [project, setProject] = React.useState<Project | null>(null);
  const [activeFile, setActiveFile] = React.useState<ProjectFile | null>(null);
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [mainView, setMainView] = React.useState<'designer' | 'editor'>('designer');
  const [itemToConfirmDelete, setItemToConfirmDelete] = React.useState<{ path: string; type: 'file' | 'directory' } | null>(null);


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

  React.useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content);
    } else {
      setEditorContent("");
    }
  }, [activeFile]);

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
        id: uuidv4(),
        name: `New ${moduleDef.name} Task`,
        module: moduleDef.module,
        parameters: JSON.parse(JSON.stringify(moduleDef.defaultParameters || {})),
        isPristine: true,
      };
    } else {
      newTask = { ...(taskDetails as AnsibleTask) };
      if (!newTask.id) newTask.id = uuidv4();
      if (newTask.isPristine === undefined) {
          newTask.isPristine = false; 
      }
    }
    updateActivePlaybookState({ tasks: [...currentActivePlaybook.tasks, newTask] });
  };

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
    addTaskToActivePlaybook(moduleDef);
    setMainView('designer');
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

  const handleDropOnTaskList = (event: React.DragEvent) => {
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

  const handleDragOverTaskList = (event: React.DragEvent) => {
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
      const newAPW = initialActionsPanelW - deltaX;
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
    setDefinedRoles(prev => [...prev, { id: uuidv4(), name: newRoleName.trim() }]);
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
          // Placeholder for future YAML inventory validation
        } else if (fileNameLower.endsWith(".json")) {
           // Placeholder for future JSON inventory validation
        } else if (fileNameLower.endsWith(".ini") || file.type === "text/plain" || fileNameLower.includes("hosts")) { 
           // Placeholder for future INI inventory validation
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

  const handleFileSelect = (path: string) => {
    if (!project) return;
    const file = project.files.find(f => f.path === path);
    if (file) {
      setActiveFile(file);
      setMainView('editor');
    }
  };

  const handleSaveActiveFile = () => {
    if (project && activeFile) {
      const updatedFiles = project.files.map(f =>
        f.path === activeFile.path ? { ...f, content: editorContent, isDefault: false } : f
      );
      const updatedProject = { ...project, files: updatedFiles };
      setProject(updatedProject);
      setActiveFile({ ...activeFile, content: editorContent, isDefault: false });
      toast({ title: "File Saved", description: `Changes to ${activeFile.path} have been saved.` });
    }
  };

  const handleAcceptFolder = (path: string) => {
    if (!project) return;
    const updatedFiles = project.files.map(file => {
      if (file.path.startsWith(path)) {
        return { ...file, isDefault: false };
      }
      return file;
    });
    setProject({ ...project, files: updatedFiles });
    toast({ title: "Accepted", description: `Default status removed for ${path}` });
  };

  const handleDeleteItem = (path: string, type: 'file' | 'directory') => {
    setItemToConfirmDelete({ path, type });
  };

  const confirmDelete = () => {
    if (itemToConfirmDelete) {
        handleDeleteFileOrFolder(itemToConfirmDelete.path);
    }
    setItemToConfirmDelete(null);
  };
  
  const handleDeleteFileOrFolder = (path: string) => {
    if (!project) return;
    
    const updatedFiles = project.files.filter(file => !file.path.startsWith(path));
    
    if (updatedFiles.length === project.files.length) {
      toast({ title: "Not Found", description: "No matching file or folder to delete.", variant: "destructive"});
      return;
    }

    setProject({ ...project, files: updatedFiles });

    // If the currently active file was deleted, deactivate it.
    if (activeFile && activeFile.path.startsWith(path)) {
      setActiveFile(null);
      setMainView('designer');
    }

    toast({ title: "Deleted", description: `Removed ${path} from the project.` });
  };

  
  const handleImportZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast({ title: "Importing...", description: "Reading project from ZIP file." });

    try {
      const zip = await JSZip.loadAsync(file);
      const files: ProjectFile[] = [];
      const promises: Promise<void>[] = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry.async('string').then(content => {
            files.push({ path: relativePath, content, isDefault: false });
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      const newProject: Project = {
        name: file.name.replace(/\.zip$/, ''),
        files,
      };

      setProject(newProject);
      setActiveFile(null); // Clear active file on new project import
      toast({ title: "Project Imported", description: `Loaded "${newProject.name}" with ${newProject.files.length} files.` });

    } catch (error) {
      console.error("Error importing ZIP file:", error);
      toast({ title: "Import Failed", description: "Could not read the ZIP file. Ensure it is a valid archive.", variant: "destructive" });
    }

    if (projectZipRef.current) {
      projectZipRef.current.value = "";
    }
  };

  const handleExportZip = async () => {
    if (!project) {
      toast({ title: "Nothing to Export", description: "No project is currently loaded.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting...", description: `Packaging "${project.name}" into a ZIP file.` });

    try {
      const zip = new JSZip();
      project.files.forEach(file => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${project.name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: "Project Exported", description: `"${project.name}.zip" has been downloaded.` });
    } catch (error) {
      console.error("Error exporting ZIP file:", error);
      toast({ title: "Export Failed", description: "An error occurred while creating the ZIP file.", variant: "destructive" });
    }
  };

  const handleCreateDefaultProject = () => {
    const defaultProjectFiles: Omit<ProjectFile, 'isDefault'>[] = [
      // Root
      { path: 'ansible.cfg', content: '[defaults]\ninventory = ./inventories\nroles_path = ./roles\n' },
      { path: 'requirements.yml', content: '# collections:\n#   - name: community.general\n' },
      { path: 'site.yml', content: '- import_playbook: playbooks/webservers.yml\n- import_playbook: playbooks/dbservers.yml\n' },
      { path: 'README.md', content: '# Ansible Project\n\nThis is a default project structure created by Ansible Architect.\n' },
      
      // Inventories
      { path: 'inventories/production/hosts', content: '[webservers]\nweb1.example.com ansible_host=192.168.1.10\nweb2.example.com ansible_host=192.168.1.11\n\n[dbservers]\ndb1.example.com ansible_host=192.168.1.20\n' },
      { path: 'inventories/production/group_vars/all.yml', content: '# Variables for all hosts in the production inventory\nansible_user: prod_user\n' },
      { path: 'inventories/production/group_vars/webservers.yml', content: 'http_port: 8080\n' },
      { path: 'inventories/production/host_vars/web1.example.com.yml', content: 'specific_var: value_for_web1\n' },
      { path: 'inventories/production/host_vars/db1.example.com.yml', content: 'db_version: 14\n' },
      { path: 'inventories/staging/hosts', content: '[webservers]\nstage-web1.example.com ansible_host=10.0.0.10\n\n[all:vars]\nansible_user: stage_user\n' },
      { path: 'inventories/staging/group_vars/all.yml', content: '# Variables for all staging hosts\n' },
      { path: 'inventories/staging/host_vars/.gitkeep', content: '' },
      
      // Global vars (less common, but good to show)
      { path: 'group_vars/all.yml', content: '# Global variables applied to all hosts, in all inventories.\n# Use inventories/<env>/group_vars/all.yml for environment-specific vars.\nntp_server: ntp.example.com\n' },
      { path: 'host_vars/localhost.yml', content: '# Variables specifically for localhost, useful for local actions.\nansible_connection: local\nansible_python_interpreter: "{{ ansible_playbook_python }}"\n' },
      
      // Playbooks
      { path: 'playbooks/webservers.yml', content: '- hosts: webservers\n  become: true\n  roles:\n    - common\n    - nginx\n' },
      { path: 'playbooks/dbservers.yml', content: '- hosts: dbservers\n  become: true\n  roles:\n    - common\n' },
      { path: 'playbooks/includes/common_tasks.yml', content: '- name: Common setup task\n  ansible.builtin.debug:\n    msg: "This is a common task included from a file."\n' },
      { path: 'playbooks/includes/hardening.yml', content: '- name: Security hardening task\n  ansible.builtin.debug:\n    msg: "This is a security hardening task."\n' },
      
      // Roles - common
      { path: 'roles/common/defaults/main.yml', content: '# Default variables for the common role.\n# These have the lowest precedence and can be easily overridden.\ncommon_package: "htop"\n' },
      { path: 'roles/common/files/.gitkeep', content: '' },
      { path: 'roles/common/handlers/main.yml', content: '# Handlers for the common role.\n- name: restart common service\n  ansible.builtin.service:\n    name: some_common_service\n    state: restarted\n' },
      { path: 'roles/common/meta/main.yml', content: 'galaxy_info:\n  author: Your Name\n  description: A common role for server setup\n  license: MIT\n  min_ansible_version: "2.12"\n  platforms:\n    - name: Ubuntu\n      versions:\n        - focal\n        - jammy\n' },
      { path: 'roles/common/tasks/main.yml', content: '- name: Common task from role\n  ansible.builtin.debug:\n    msg: "Hello from the common role!"\n\n- name: Install common package\n  ansible.builtin.package:\n    name: "{{ common_package }}"\n    state: present\n' },
      { path: 'roles/common/tasks/install.yml', content: '- name: Installation task from common role\n  ansible.builtin.debug:\n    msg: "Installing common packages"\n' },
      { path: 'roles/common/templates/.gitkeep', content: '' },
      { path: 'roles/common/tests/test.yml', content: '- hosts: localhost\n  remote_user: root\n  roles:\n    - common\n' },
      { path: 'roles/common/vars/main.yml', content: '# Variables for the common role.\n# These have high precedence within the role.\n' },
      
      // Roles - nginx
      { path: 'roles/nginx/defaults/main.yml', content: '# Defaults for nginx role\nnginx_worker_processes: "auto"\n' },
      { path: 'roles/nginx/files/.gitkeep', content: '' },
      { path: 'roles/nginx/handlers/main.yml', content: '- name: restart nginx\n  ansible.builtin.service:\n    name: nginx\n    state: restarted\n' },
      { path: 'roles/nginx/meta/main.yml', content: 'galaxy_info:\n  author: Your Name\n  description: Installs and configures Nginx\n  license: MIT\n  min_ansible_version: "2.12"\n' },
      { path: 'roles/nginx/tasks/main.yml', content: '- name: Install Nginx\n  ansible.builtin.package:\n    name: nginx\n    state: present\n  notify:\n    - restart nginx\n\n- name: Ensure Nginx is running and enabled\n  ansible.builtin.service:\n    name: nginx\n    state: started\n    enabled: yes\n' },
      { path: 'roles/nginx/templates/nginx.conf.j2', content: 'worker_processes {{ nginx_worker_processes }};\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    server {\n        listen {{ http_port }};\n        server_name _;\n\n        location / {\n            root /usr/share/nginx/html;\n        }\n    }\n}\n' },
      { path: 'roles/nginx/tests/test.yml', content: '- hosts: localhost\n  remote_user: root\n  roles:\n    - nginx\n' },
      { path: 'roles/nginx/vars/main.yml', content: '# Variables for nginx role\n' },
      
      // Other top-level directories
      { path: 'library/.gitkeep', content: '' },
      { path: 'filter_plugins/.gitkeep', content: '' },
      { path: 'tests/test_site.yml', content: '# Tests for the main site playbook\n- hosts: all\n  tasks:\n    - name: Ping all hosts\n      ansible.builtin.ping:\n' },
      { path: 'tests/mock_inventory', content: '[testgroup]\nlocalhost ansible_connection=local\n' },
      
      // Collections
      { path: 'collections/ansible_collections/my_namespace/my_collection/galaxy.yml', content: 'namespace: my_namespace\nname: my_collection\nversion: 1.0.0\nauthors:\n  - Your Name <you@example.com>\n' },
      { path: 'collections/ansible_collections/my_namespace/my_collection/playbooks/.gitkeep', content: '' },
      { path: 'collections/ansible_collections/my_namespace/my_collection/plugins/modules/.gitkeep', content: '' },
      { path: 'collections/ansible_collections/my_namespace/my_collection/roles/.gitkeep', content: '' },
    ];
    
    const newProject: Project = {
      name: 'Default Ansible Project',
      files: defaultProjectFiles.map(file => ({ ...file, isDefault: true })),
    };
    
    setProject(newProject);
    setActiveFile(null); // Clear active file
    toast({ title: "Project Created", description: `Created "${newProject.name}" with ${defaultProjectFiles.length} files.` });
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
    <div className="flex h-screen bg-background p-4 space-x-0">
      {/* Left Panel */}
      <div
        style={{ flex: `0 0 ${col1Width}px` }}
        className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden"
      >
        <div className="p-3 flex items-center border-b flex-shrink-0">
          <AnsibleArchitectIcon className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-lg font-bold font-headline text-primary">Ansible Architect</h1>
        </div>
        <Tabs defaultValue="project" className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 mx-3 mt-2">
            <TabsTrigger value="modules" className="flex-1 text-xs">Modules</TabsTrigger>
            <TabsTrigger value="project" className="flex-1 text-xs">Project</TabsTrigger>
          </TabsList>
          <TabsContent value="modules" className="flex-1 min-h-0">
            <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
          </TabsContent>
          <TabsContent value="project" className="flex-1 min-h-0">
            <ProjectExplorer 
                project={project} 
                onFileSelect={handleFileSelect} 
                activeFilePath={activeFile?.path || null} 
                onCreateDefaultProject={handleCreateDefaultProject}
                onAcceptFolder={handleAcceptFolder}
                onDeleteFolder={(path) => handleDeleteItem(path, 'directory')}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Resizer onMouseDown={(e) => handleMouseDown("col1", e)} />

      {/* Middle Panel */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
        <Tabs value={mainView} onValueChange={(value) => setMainView(value as 'designer' | 'editor')} className="flex flex-col flex-1 min-w-0 min-h-0">
          <TabsList className="flex-shrink-0 border-b bg-card rounded-t-lg p-1">
             <TabsTrigger value="designer" className="text-xs px-2 py-1.5 h-auto">Designer</TabsTrigger>
             <TabsTrigger value="editor" className="text-xs px-2 py-1.5 h-auto" disabled={!activeFile}>Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="designer" className="flex-1 min-h-0 rounded-b-lg overflow-hidden bg-card data-[state=inactive]:hidden">
             {/* Playbook Designer View */}
            <Tabs
              value={activePlaybookId || ""}
              onValueChange={setActivePlaybookId}
              className="flex flex-col flex-1 min-w-0 min-h-0" 
            >
              <div className="flex items-center border-b bg-card">
                <TabsList className="bg-card p-1 h-auto rounded-none">
                  {playbooks.map(p => (
                    <TabsTrigger
                      key={p.id}
                      value={p.id}
                      className="text-xs px-2 py-1.5 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative group"
                    >
                      <span className="max-w-[120px] truncate" title={p.name}>{p.name}</span>
                      <Button asChild variant="ghost" size="icon" className="w-5 h-5 ml-1.5 opacity-50 group-hover:opacity-100 hover:bg-accent/20" aria-label="Rename playbook">
                          <span role="button" tabIndex={0} onClick={(e) => openRenameModal(p.id, p.name, e)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRenameModal(p.id, p.name, e); }}}>
                            <Edit2 className="w-3 h-3" />
                          </span>
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="w-5 h-5 ml-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20" aria-label="Close playbook">
                          <span role="button" tabIndex={0} onClick={(e) => handleClosePlaybook(p.id, e)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClosePlaybook(p.id, e); }}}>
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
              
              <div className="flex-grow min-h-0 relative overflow-hidden">
                  {playbooks.map(p => (
                  <TabsContent
                      key={p.id}
                      value={p.id}
                      className="absolute inset-0 flex data-[state=inactive]:hidden mt-0"
                  >
                      <div
                      style={{ flex: `0 0 ${col2Width}px` }}
                      className="min-w-0 bg-card shadow-sm flex flex-col border-r"
                      >
                        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Playbook Tasks</h2>
                        <div 
                          className="flex-grow min-h-0"
                        >
                            <TaskList
                            tasks={p.tasks}
                            onUpdateTask={updateTaskInActivePlaybook}
                            onDeleteTask={deleteTaskInActivePlaybook}
                            onMoveTask={moveTaskInActivePlaybook}
                            definedRoles={definedRoles}
                            hoveredTaskId={p.id === activePlaybookId ? hoveredTaskId : null}
                            onSetHoveredTaskId={setHoveredTaskId}
                            onDrop={handleDropOnTaskList}
                            onDragOver={handleDragOverTaskList}
                            onDragLeave={handleDragLeaveTaskList}
                            isDraggingOver={isDraggingOver}
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
          </TabsContent>

          <TabsContent value="editor" className="flex-1 flex flex-col min-h-0 rounded-b-lg overflow-hidden bg-card data-[state=inactive]:hidden">
            {/* File Editor View */}
            {activeFile ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                     <h2 className="text-base font-semibold font-code" title={activeFile.path}>{activeFile.path}</h2>
                     {activeFile.isDefault && <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFile.isDefault && (
                      <Button size="sm" variant="outline" onClick={() => handleAcceptFolder(activeFile.path)}>
                        <Check className="w-4 h-4 mr-2" />
                        Accept File
                      </Button>
                    )}
                    <Button size="sm" onClick={handleSaveActiveFile}>Save Changes</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(activeFile.path, 'file')}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete File
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <Textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="h-full w-full resize-none border-0 rounded-none font-code text-sm focus-visible:ring-0"
                    placeholder={`Content for ${activeFile.path}`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a file from the Project Explorer to edit.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Resizer onMouseDown={(e) => handleMouseDown("actionsPanel", e)} />

      {/* Actions Panel */}
      <div 
        style={{ flex: `0 0 ${actionsPanelWidth}px` }}
        className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden"
      >
        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Actions</h2>
        <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2 whitespace-nowrap">
              <Button onClick={() => projectZipRef.current?.click()} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Import Project (ZIP)
              </Button>
              <input type="file" ref={projectZipRef} onChange={handleImportZip} accept=".zip" className="hidden" />
              
              <Button onClick={handleExportZip} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
                <Archive className="w-3.5 h-3.5 mr-1.5" /> Export Project (ZIP)
              </Button>
              
              <Separator className="my-2"/>

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
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Playbook YAML
              </Button>
              <Button onClick={handleCopyYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
                <CopyIconLucide className="w-3.5 h-3.5 mr-1.5" />
                Copy Playbook YAML
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
        </ScrollArea>
      </div>

      {/* Modals */}
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
      
      <AlertDialog open={!!itemToConfirmDelete} onOpenChange={(isOpen) => !isOpen && setItemToConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {itemToConfirmDelete?.type} and all its contents: <br />
              <strong className="font-mono break-all">{itemToConfirmDelete?.path}</strong>
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isClientReady && isInventoryVisualizerOpen && (
        <InventoryStructureVisualizer
          isOpen={isInventoryVisualizerOpen}
          onOpenChange={setIsInventoryVisualizerOpen}
        />
      )}
    </div>
  );
}
