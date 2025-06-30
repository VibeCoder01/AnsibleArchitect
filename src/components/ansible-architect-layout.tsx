
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
import { Download, ExternalLink, Settings, Trash2, PlusCircle, X, FilePlus, Edit2, FileCheck, Eye as EyeIcon, Copy as CopyIconLucide, Archive, UploadCloud, Check, Save, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import * as yaml from "js-yaml";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybookYAML, AnsibleRoleRef, DesignerFileState, Project, ProjectFile, ProjectIssue } from "@/types/ansible";
import { moduleGroups } from "@/config/ansible-modules";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


const InventoryStructureVisualizer = dynamic(() => import('@/components/inventory-structure-visualizer').then(mod => mod.InventoryStructureVisualizer), {
  ssr: false,
});


const MIN_COLUMN_WIDTH = 150; 
const LOCAL_STORAGE_DESIGNER_FILES_KEY = "ansibleArchitectDesignerFiles";
const LOCAL_STORAGE_ACTIVE_DESIGNER_FILE_ID_KEY = "ansibleArchitectActiveDesignerFileId";
const moduleDefinitions = moduleGroups.flatMap(g => g.modules);


function parseYamlToTasks(yamlContent: string): AnsibleTask[] {
  try {
    const data = yaml.load(yamlContent);
    // If YAML is null, empty, or not an array, treat it as a single (potentially empty) raw block
    if (data === null || typeof data === 'undefined' || !Array.isArray(data)) {
      return [{
        id: uuidv4(),
        name: "Custom YAML Block",
        module: 'custom.block',
        parameters: {},
        rawYAML: yamlContent || '',
        isPristine: false,
      }];
    }

    return data.map((item: any) => {
      if (typeof item !== 'object' || item === null) {
        return {
          id: uuidv4(),
          name: `Custom Value`,
          module: 'custom.block',
          parameters: {},
          rawYAML: yaml.dump(item),
          isPristine: false,
        };
      }

      let identifiedModule: AnsibleModuleDefinition | undefined;
      let moduleKey = '';
      
      const itemKeys = Object.keys(item);
      // Find a key that matches a known module definition
      for (const key of itemKeys) {
        const foundModule = moduleDefinitions.find(m => m.module === key);
        if (foundModule) {
          identifiedModule = foundModule;
          moduleKey = key;
          break;
        }
      }

      if (identifiedModule) {
        // We found a known module, create a structured task
        return {
          id: uuidv4(),
          name: item.name || identifiedModule.name,
          module: identifiedModule.module,
          parameters: typeof item[moduleKey] === 'object' ? item[moduleKey] : {},
          isPristine: false,
        };
      } else {
        // It's a custom block, store as raw YAML
        return {
          id: uuidv4(),
          name: item.name || `Custom Block`,
          module: 'custom.block',
          parameters: {},
          rawYAML: yaml.dump(item, { indent: 2 }),
          isPristine: false,
        };
      }
    });

  } catch (error) {
    console.error("Error parsing YAML file for designer:", error);
    toast({ title: "YAML Parsing Error", description: "Could not parse file. Opening as a single raw block.", variant: "destructive" });
    // If parsing fails, treat the whole file as a single raw block
    return [{
      id: uuidv4(),
      name: "Invalid YAML (edit as raw text)",
      module: 'custom.block.error',
      parameters: {},
      rawYAML: yamlContent,
      isPristine: false,
    }];
  }
}

function generateYamlSegments(tasks: AnsibleTask[]): YamlSegment[] {
  const segments: YamlSegment[] = [];

  tasks.forEach(task => {
    let taskBlockContent = "";
    if (task.rawYAML) {
      taskBlockContent = task.rawYAML;
    } else {
      // Create a temporary object to dump to YAML
      const taskObject: any = { name: task.name };
       if (task.comment) {
        // js-yaml doesn't support comments on dump, so we can't add it here reliably
        // It must be handled during rendering if needed, or by using rawYAML
      }
      taskObject[task.module] = task.parameters || {};
      taskBlockContent = yaml.dump([taskObject], { indent: 2 }).trim();
    }
    
    // Ensure consistent newlines
    taskBlockContent = taskBlockContent.trim() + '\n';
    
    segments.push({ id: task.id, content: taskBlockContent, isTaskBlock: true });
  });

  return segments;
}


const createNewDesignerFile = (name?: string): DesignerFileState => ({
  id: uuidv4(), // Temporary ID until saved to project
  name: name || `Untitled File ${Date.now() % 10000}.yml`,
  tasks: [],
});

interface StoppableEvent {
  stopPropagation: () => void;
  preventDefault?: () => void;
}


export function AnsibleArchitectLayout() {
  const [designerFiles, setDesignerFiles] = React.useState<DesignerFileState[]>([]);
  const [activeDesignerFileId, setActiveDesignerFileId] = React.useState<string | null>(null);
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
  const [renamingFileId, setRenamingFileId] = React.useState<string | null>(null);
  const [tempFileName, setTempFileName] = React.useState("");
  
  const inventoryFileRef = React.useRef<HTMLInputElement>(null);
  const playbookFileRef = React.useRef<HTMLInputElement>(null);
  const projectZipRef = React.useRef<HTMLInputElement>(null);

  const [isInventoryVisualizerOpen, setIsInventoryVisualizerOpen] = React.useState(false);

  // Project state
  const [project, setProject] = React.useState<Project | null>(null);
  const [activeEditorFile, setActiveEditorFile] = React.useState<ProjectFile | null>(null);
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [mainView, setMainView] = React.useState<'designer' | 'editor'>('designer');
  const [itemToConfirmDelete, setItemToConfirmDelete] = React.useState<{ path: string; type: 'file' | 'directory' } | null>(null);
  const [projectIssues, setProjectIssues] = React.useState<ProjectIssue[]>([]);
  const [isProjectCheckModalOpen, setIsProjectCheckModalOpen] = React.useState(false);


  React.useEffect(() => {
    const storedFiles = localStorage.getItem(LOCAL_STORAGE_DESIGNER_FILES_KEY);
    const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_DESIGNER_FILE_ID_KEY);
    let initialFiles: DesignerFileState[] = [];
    let initialActiveId: string | null = null;

    if (storedFiles) {
      try {
        const parsedFiles = JSON.parse(storedFiles) as DesignerFileState[];
        if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
          initialFiles = parsedFiles;
          if (storedActiveId && parsedFiles.some((p: DesignerFileState) => p.id === storedActiveId)) {
            initialActiveId = storedActiveId;
          } else {
            initialActiveId = parsedFiles[0].id;
          }
        }
      } catch (error) {
        console.error("Error parsing designer files from localStorage:", error);
      }
    }

    if (initialFiles.length === 0) {
      const defaultFile = createNewDesignerFile("Default Playbook.yml");
      initialFiles = [defaultFile];
      initialActiveId = defaultFile.id;
    }

    setDesignerFiles(initialFiles);
    setActiveDesignerFileId(initialActiveId);
    setIsClientReady(true); 
  }, []);

  React.useEffect(() => {
    if (!isClientReady) return;

    if (designerFiles.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_DESIGNER_FILES_KEY, JSON.stringify(designerFiles));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_DESIGNER_FILES_KEY);
    }
    if (activeDesignerFileId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_DESIGNER_FILE_ID_KEY, activeDesignerFileId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_DESIGNER_FILE_ID_KEY);
    }
  }, [designerFiles, activeDesignerFileId, isClientReady]);

  React.useEffect(() => {
    if (activeEditorFile) {
      setEditorContent(activeEditorFile.content);
    } else {
      setEditorContent("");
    }
  }, [activeEditorFile]);
  
  const getActiveDesignerFile = React.useCallback(() => {
    return designerFiles.find(p => p.id === activeDesignerFileId);
  }, [designerFiles, activeDesignerFileId]);

  const updateActiveDesignerFileState = React.useCallback((updatedFields: Partial<DesignerFileState>) => {
    setDesignerFiles(prev =>
      prev.map(p => (p.id === activeDesignerFileId ? { ...p, ...updatedFields } : p))
    );
  }, [activeDesignerFileId]);


  const activeDesignerFile = getActiveDesignerFile();
  const yamlSegments = React.useMemo(() => {
    if (!activeDesignerFile) return [];
    return generateYamlSegments(activeDesignerFile.tasks);
  }, [activeDesignerFile]);

  const fullYamlContent = React.useMemo(() => yamlSegments.map(segment => segment.content).join(''), [yamlSegments]);

  const addTaskToActiveFile = (taskDetails: AnsibleModuleDefinition | AnsibleTask) => {
    const currentActiveFile = designerFiles.find(p => p.id === activeDesignerFileId);
    if (!currentActiveFile) return; 
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
    updateActiveDesignerFileState({ tasks: [...currentActiveFile.tasks, newTask] });
  };

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
    addTaskToActiveFile(moduleDef);
    setMainView('designer');
  };

  const updateTaskInActiveFile = (updatedTask: AnsibleTask) => {
    const currentActiveFile = designerFiles.find(p => p.id === activeDesignerFileId);
    if (!currentActiveFile) return;
    updateActiveDesignerFileState({
      tasks: currentActiveFile.tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)),
    });
  };

  const deleteTaskInActiveFile = (taskId: string) => {
    const currentActiveFile = designerFiles.find(p => p.id === activeDesignerFileId);
    if (!currentActiveFile) return; 
    updateActiveDesignerFileState({
      tasks: currentActiveFile.tasks.filter(task => task.id !== taskId),
    });
  };

  const moveTaskInActiveFile = (dragIndex: number, hoverIndex: number) => {
    const currentActiveFile = designerFiles.find(p => p.id === activeDesignerFileId);
    if (!currentActiveFile) return; 
    const newTasks = [...currentActiveFile.tasks];
    const [draggedItem] = newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedItem);
    updateActiveDesignerFileState({ tasks: newTasks });
  };

  const handleExportYaml = () => {
    if (!fullYamlContent) { 
      toast({ title: "Error", description: "No YAML content to export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([fullYamlContent], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const currentActiveFile = getActiveDesignerFile();
    link.download = `${currentActiveFile?.name.replace(/\s+/g, '_') || 'file'}.yml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Exported", description: "File YAML downloaded." });
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
        // Basic Ansible-specific validation can remain as a progressive enhancement
        let hasSemanticIssues = false;
        const semanticErrors: string[] = [];
        const semanticWarnings: string[] = [];
        if (Array.isArray(playbook)) {
          (playbook as any[]).forEach((play, playIndex) => {
            if (typeof play === 'object' && play !== null && (play.hosts || play.tasks)) {
               if (!play.hosts || typeof play.hosts !== 'string') {
                semanticWarnings.push(`Play ${playIndex + 1} (name: "${play.name || 'Unnamed'}") looks like an Ansible play but is missing a 'hosts' key.`);
              }
            }
          });
        }
        
        if (semanticWarnings.length > 0) {
          toast({
            title: "YAML Validation Successful (with warnings)",
            description: `${validationMessage} Ansible-specific warnings: ${semanticWarnings.join("; ")}`,
            variant: "default",
            className: "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
          });
        } else {
          toast({
            title: "YAML Validation Successful",
            description: `${validationMessage} The file is valid YAML.`,
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
          title: "YAML Validation Failed",
          description: `Error in "${file.name}": ${errorMessage}.`,
          variant: "destructive",
        });
        console.error(`YAML Validation Error (${file.name}):`, error);
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
    if (!activeDesignerFileId) { 
      toast({ title: "Error", description: "No active file to add blocks to.", variant: "destructive" });
      return;
    }
    try {
      const moduleDataString = event.dataTransfer.getData("application/json");
      if (moduleDataString) {
        const moduleDefinition: AnsibleModuleDefinition = JSON.parse(moduleDataString);
        addTaskToActiveFile(moduleDefinition);
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

  const handleNewFile = () => {
    const newFile = createNewDesignerFile();
    setDesignerFiles(prev => [...prev, newFile]);
    setActiveDesignerFileId(newFile.id);
    toast({ title: "New File", description: `"${newFile.name}" created and opened in designer.`});
  };

  const handleCloseFile = (fileIdToClose: string, event: StoppableEvent | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const fileToClose = designerFiles.find(p => p.id === fileIdToClose);

    setDesignerFiles(prev => {
      const remainingFiles = prev.filter(p => p.id !== fileIdToClose);
      if (remainingFiles.length === 0) {
        const newDefault = createNewDesignerFile("Default File.yml");
        setActiveDesignerFileId(newDefault.id);
        return [newDefault];
      }
      if (activeDesignerFileId === fileIdToClose) {
        const closedTabIndex = prev.findIndex(p => p.id === fileIdToClose);
        let newActiveId = remainingFiles[0].id;
        if (closedTabIndex > 0 && closedTabIndex <= remainingFiles.length) {
            const potentialPrevFile = prev[closedTabIndex -1];
            if (remainingFiles.some(r => r.id === potentialPrevFile.id)) {
                newActiveId = potentialPrevFile.id;
            }
        }
        setActiveDesignerFileId(newActiveId);
      }
      return remainingFiles;
    });
    if (fileToClose) {
        toast({ title: "File Closed", description: `"${fileToClose.name}" closed.`});
    }
  };

  const openRenameModal = (fileId: string, currentName: string, event: StoppableEvent | React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setRenamingFileId(fileId);
    setTempFileName(currentName);
    setIsRenameModalOpen(true);
  };

  const handleRenameFile = () => {
    if (!renamingFileId || tempFileName.trim() === "") { 
      toast({title: "Error", description: "File name cannot be empty.", variant: "destructive"});
      return;
    }
    setDesignerFiles(prev => prev.map(p => p.id === renamingFileId ? {...p, name: tempFileName.trim()} : p));
    toast({title: "File Renamed", description: `File renamed to "${tempFileName.trim()}".`});
    setIsRenameModalOpen(false);
    setRenamingFileId(null);
    setTempFileName("");
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
        // Validation logic can be simplified or removed if not strictly ansible inventory
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
    const fileData = project.files.find(f => f.path === path);
    if (!fileData) return;
  
    if (!path.endsWith('.yml') && !path.endsWith('.yaml')) {
      setActiveEditorFile(fileData);
      setMainView('editor');
      return;
    }
    
    const existingFile = designerFiles.find(f => f.id === path);
    if (existingFile) {
      setActiveDesignerFileId(path);
      setMainView('designer');
      return;
    }
  
    const tasks = parseYamlToTasks(fileData.content);
    
    const newDesignerFile: DesignerFileState = {
      id: path,
      name: path.split('/').pop() || path,
      tasks: tasks,
    };
    
    setDesignerFiles(prev => [...prev, newDesignerFile]);
    setActiveDesignerFileId(newDesignerFile.id);
    setMainView('designer');
    toast({ title: "File Opened in Designer", description: `Switched to designer view for ${newDesignerFile.name}` });
  };
  

  const handleSaveActiveEditorFile = () => {
    if (project && activeEditorFile) {
      const updatedFiles = project.files.map(f =>
        f.path === activeEditorFile.path ? { ...f, content: editorContent, isDefault: false } : f
      );
      const updatedProject = { ...project, files: updatedFiles };
      setProject(updatedProject);
      setActiveEditorFile({ ...activeEditorFile, content: editorContent, isDefault: false });
      toast({ title: "File Saved", description: `Changes to ${activeEditorFile.path} have been saved.` });
    }
  };

  const handleSaveDesignerFile = () => {
    const activeFile = getActiveDesignerFile();
    if (!project || !activeFile) {
      toast({title: "Error", description: "No active file in designer to save.", variant: "destructive"});
      return;
    };

    const newYamlContent = activeFile.tasks.map(task => {
        if (task.rawYAML) return task.rawYAML;
        const taskObject: any = { name: task.name };
        taskObject[task.module] = task.parameters || {};
        return yaml.dump([taskObject], { indent: 2 });
    }).join('\n');
    
    const updatedFiles = project.files.map(f => 
        f.path === activeFile.id ? { ...f, content: newYamlContent, isDefault: false } : f
    );
    const fileExists = project.files.some(f => f.path === activeFile.id);

    if (fileExists) {
        setProject({ ...project, files: updatedFiles });
        toast({ title: "File Saved", description: `Changes to ${activeFile.name} saved to project.` });
    } else {
        toast({ title: "Save Failed", description: `File path "${activeFile.id}" not found in project. Export instead.`, variant: "destructive" });
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
        // If the file being deleted is open in the editor, close the editor view
        if (itemToConfirmDelete.type === 'file' && activeEditorFile?.path === itemToConfirmDelete.path) {
          setActiveEditorFile(null);
          setMainView('designer');
        }
        
        // If the file being deleted is open in the designer, close its tab
        if (itemToConfirmDelete.type === 'file' && designerFiles.some(f => f.id === itemToConfirmDelete!.path)) {
            const mockEvent = { stopPropagation: () => {} };
            handleCloseFile(itemToConfirmDelete.path, mockEvent);
        }

        // Perform the actual deletion from the project
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

    if (activeEditorFile && activeEditorFile.path.startsWith(path)) {
      setActiveEditorFile(null);
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
        id: uuidv4(),
        name: file.name.replace(/\.zip$/, ''),
        files,
      };

      setProject(newProject);
      setActiveEditorFile(null);
      setDesignerFiles([]);
      setActiveDesignerFileId(null);
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
      id: uuidv4(),
      name: 'Default Ansible Project',
      files: defaultProjectFiles.map(file => ({ ...file, isDefault: true })),
    };
    
    setProject(newProject);
    setActiveEditorFile(null); // Clear active file
    setDesignerFiles([]);
    setActiveDesignerFileId(null);
    toast({ title: "Project Created", description: `Created "${newProject.name}" with ${defaultProjectFiles.length} files.` });
  };

  const handleMoveItem = (sourcePath: string, destinationFolderPath: string) => {
    if (!project) return;

    if (destinationFolderPath.startsWith(sourcePath + '/')) {
        toast({ title: "Invalid Move", description: "Cannot move a folder into itself.", variant: "destructive"});
        return;
    }
    
    const sourceBaseName = sourcePath.split('/').pop();
    if (!sourceBaseName) return;

    const newFiles = project.files.map(file => {
        if (file.path.startsWith(sourcePath)) {
            const tail = file.path.substring(sourcePath.length);
            const newPath = `${destinationFolderPath}/${sourceBaseName}${tail}`;
            
            if (file.path === activeDesignerFileId) {
                setActiveDesignerFileId(newPath);
            }
            if (file.path === activeEditorFile?.path) {
                setActiveEditorFile(prev => prev ? { ...prev, path: newPath } : null);
            }
            setDesignerFiles(prevFiles => prevFiles.map(df => {
                if (df.id === file.path) {
                    return {...df, id: newPath};
                }
                return df;
            }));

            return { ...file, path: newPath };
        }
        return file;
    });
    
    setProject({ ...project, files: newFiles });
    toast({ title: "Item Moved", description: `Moved "${sourceBaseName}" to "${destinationFolderPath}".` });
  };


  const handleCheckProject = () => {
    if (!project) {
      toast({ title: "No Project Loaded", description: "Cannot check an empty project.", variant: "destructive" });
      return;
    }
  
    const issues: ProjectIssue[] = [];
    const files = project.files;
    const filePaths = files.map(f => f.path);
  
    // 1. Missing ansible.cfg
    if (!filePaths.includes('ansible.cfg')) {
      issues.push({
        category: "Config",
        error: "Missing ansible.cfg",
        why: "Falls back to global config, may cause unexpected behaviour.",
        path: "Project Root",
      });
    }
  
    // 2. Missing site.yml or equivalent root playbook
    if (!filePaths.some(p => ['site.yml', 'main.yml', 'playbook.yml'].includes(p.split('/').pop() || ''))) {
      issues.push({
        category: "Playbook Organisation",
        error: "No site.yml or root-level entrypoint",
        why: "No clear starting point for execution.",
        path: "Project Root",
      });
    }
  
    // 3. & 4. Roles structure check
    const roles = files.filter(f => f.path.startsWith('roles/'));
    if (roles.length > 0) {
      const roleNames = [...new Set(roles.map(r => r.path.split('/')[1]).filter(Boolean))];
      
      for (const roleName of roleNames) {
        const rolePath = `roles/${roleName}/`;
        if (!filePaths.some(p => p === `${rolePath}tasks/main.yml`)) {
          issues.push({
            category: "Roles",
            error: `Missing tasks/main.yml in role "${roleName}"`,
            why: "Execution will fail when role is included without a tasks/main.yml.",
            path: `${rolePath}tasks/`,
          });
        }
        
        const standardSubdirs = ['tasks', 'handlers', 'defaults', 'vars', 'meta', 'files', 'templates'];
        const hasAnyStandardSubdir = standardSubdirs.some(subdir => 
            filePaths.some(p => p.startsWith(`${rolePath}${subdir}/`))
        );

        if (!hasAnyStandardSubdir) {
          issues.push({
              category: "Roles",
              error: `Role "${roleName}" has no standard subdirectories`,
              why: "A role should contain at least one of tasks/, handlers/, defaults/, etc. to be structured correctly.",
              path: rolePath,
          });
        }
      }
    }
    
    // Regex for IP addresses
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    // Regex for plaintext secrets
    const secretRegex = /(password|token|secret|api_key|private_key):\s*['"]?(.+)['"]?/i;

    for (const file of files) {
      // 6. Hardcoded IPs (outside of vars/inventory files)
      if (file.path.endsWith('.yml') && !file.path.startsWith('inventories/') && !file.path.startsWith('group_vars/') && !file.path.startsWith('host_vars/')) {
        if (ipRegex.test(file.content)) {
          issues.push({
            category: "Inventory",
            error: "Potential hardcoded IP address found",
            why: "Hardcoding IPs reduces portability. Use inventory variables instead.",
            path: file.path,
          });
        }
      }

      if (file.path.endsWith('.yml') || file.path.endsWith('.yaml')) {
        let parsedYamlDocs: any[];
        try {
          // 8. Invalid or unlinted YAML
          parsedYamlDocs = yaml.loadAll(file.content);
        } catch (e) {
          issues.push({
            category: "YAML quality",
            error: "Invalid YAML syntax",
            why: "File cannot be parsed and will break playbook execution.",
            path: file.path,
          });
          continue; // Skip other checks for this file
        }
        
        // 5. Plaintext secrets
        if (secretRegex.test(file.content)) {
            issues.push({
              category: "Secrets",
              error: "Potential plaintext secret found",
              why: "Committing secrets in plaintext is a security risk. Use ansible-vault.",
              path: file.path,
            });
        }

        // 10. Non-portable paths
        for (const doc of parsedYamlDocs) {
            if (!doc) continue;

            const checkTasksRecursively = (taskList: any[]) => {
              if (!Array.isArray(taskList)) return;

              taskList.forEach(task => {
                if (!task || typeof task !== 'object') return;
                
                // Recurse into nested task structures
                if (task.block) checkTasksRecursively(Array.isArray(task.block) ? task.block : []);
                if (task.rescue) checkTasksRecursively(Array.isArray(task.rescue) ? task.rescue : []);
                if (task.always) checkTasksRecursively(Array.isArray(task.always) ? task.always : []);

                const checkPath = (moduleName: string, pathValue: any) => {
                    if (typeof pathValue === 'string' && pathValue.startsWith('/') && !pathValue.startsWith('/dev/')) {
                        issues.push({
                            category: "Non-portable paths",
                            error: `Absolute path used in module "${moduleName}"`,
                            why: `Using an absolute source path like '${pathValue}' breaks portability. Use paths relative to the role or playbook.`,
                            path: file.path,
                        });
                    }
                };

                // Check for ansible.builtin.copy's 'src'
                if (task['ansible.builtin.copy'] && task['ansible.builtin.copy'].src) {
                    checkPath('ansible.builtin.copy', task['ansible.builtin.copy'].src);
                }

                // Check for ansible.builtin.template's 'src'
                if (task['ansible.builtin.template'] && task['ansible.builtin.template'].src) {
                    checkPath('ansible.builtin.template', task['ansible.builtin.template'].src);
                }

                // Check for ansible.builtin.script's path
                if (task['ansible.builtin.script']) {
                    checkPath('ansible.builtin.script', task['ansible.builtin.script']);
                }
              });
            };

            if (Array.isArray(doc)) {
              checkTasksRecursively(doc);
            } else if (typeof doc === 'object' && doc !== null) {
              checkTasksRecursively(doc.tasks || []);
              checkTasksRecursively(doc.pre_tasks || []);
              checkTasksRecursively(doc.post_tasks || []);
              checkTasksRecursively(doc.handlers || []);
            }
        }
      }
    }
    
    // 11. No use of group_vars/ or host_vars/
    if (!filePaths.some(p => p.startsWith('group_vars/')) && !filePaths.some(p => p.startsWith('host_vars/'))) {
      if (files.length > 10) { // Heuristic for non-trivial projects
        issues.push({
          category: "Variable structure",
          error: "No use of group_vars/ or host_vars/",
          why: "Centralizing variables in group_vars/ or host_vars/ improves structure and reusability over playbook-level 'vars'.",
          path: "Project Root",
        });
      }
    }
  
    setProjectIssues(issues);
    setIsProjectCheckModalOpen(true);
  };


  const activeDesignerFileIsDefault = project?.files.find(f => f.path === activeDesignerFile?.id)?.isDefault;
  const activeFilePath = mainView === 'editor' ? activeEditorFile?.path ?? null : activeDesignerFileId;

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
    <TooltipProvider>
      <div className="flex h-screen bg-background p-4 space-x-0">
        {/* Left Panel */}
        <div
          style={{ flex: `0 0 ${col1Width}px` }}
          className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col"
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
            <TabsContent value="modules" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
              <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
            </TabsContent>
            <TabsContent value="project" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
              <ProjectExplorer 
                  project={project} 
                  onFileSelect={handleFileSelect} 
                  activeFilePath={activeFilePath} 
                  onCreateDefaultProject={handleCreateDefaultProject}
                  onAcceptFolder={handleAcceptFolder}
                  onDeleteFolder={(path) => handleDeleteItem(path, 'directory')}
                  onMoveItem={handleMoveItem}
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
              <TabsTrigger value="editor" className="text-xs px-2 py-1.5 h-auto" disabled={!activeEditorFile}>Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="designer" className="flex-1 min-h-0 rounded-b-lg overflow-hidden bg-card data-[state=inactive]:hidden flex flex-col">
              <div className="flex items-center justify-between p-2 border-b bg-card flex-shrink-0">
                <div className="flex items-center">
                  <Select value={activeDesignerFileId || ""} onValueChange={setActiveDesignerFileId}>
                      <SelectTrigger className="w-[250px] h-9 text-sm font-medium">
                          <SelectValue placeholder="Select a file" />
                      </SelectTrigger>
                      <SelectContent>
                          {designerFiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                              {p.name}
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>

                  {activeDesignerFile && (
                  <>
                      <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1.5 w-7 h-7"
                      onClick={(e) => openRenameModal(activeDesignerFile.id, activeDesignerFile.name, e)}
                      >
                      <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={(e) => handleCloseFile(activeDesignerFile.id, e)}
                      disabled={designerFiles.length <= 1}
                      >
                      <X className="w-4 h-4" />
                      </Button>
                  </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeDesignerFile && project?.files.some(f => f.path === activeDesignerFile.id) && (
                    <>
                      {activeDesignerFileIsDefault && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleAcceptFolder(activeDesignerFile.id)}>
                              <Check className="w-4 h-4 mr-2" />
                              Accept File
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove the 'default' status, marking this as a permanent project file.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button size="sm" onClick={handleSaveDesignerFile}>
                        <Save className="w-4 h-4 mr-2" />
                        Save to Project
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(activeDesignerFile.id, 'file')}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete File
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div 
                className="flex-grow min-h-0 flex"
                onDrop={handleDropOnTaskList}
                onDragOver={handleDragOverTaskList}
                onDragLeave={handleDragLeaveTaskList}
              >
                <div
                    className="w-full h-full flex"
                  >
                  {activeDesignerFile ? (
                  <>
                      <div
                          style={{ flex: `0 0 ${col2Width}px` }}
                          className="min-w-0 bg-card shadow-sm flex flex-col border-r"
                      >
                          <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">YAML Blocks</h2>
                          <div className="flex-grow min-h-0">
                              <TaskList
                                  tasks={activeDesignerFile.tasks}
                                  onUpdateTask={updateTaskInActiveFile}
                                  onDeleteTask={deleteTaskInActiveFile}
                                  onMoveTask={moveTaskInActiveFile}
                                  definedRoles={definedRoles}
                                  hoveredTaskId={hoveredTaskId}
                                  onSetHoveredTaskId={setHoveredTaskId}
                                  isDraggingOver={isDraggingOverTaskList}
                              />
                          </div>
                      </div>

                      <Resizer onMouseDown={(e) => handleMouseDown("col2", e)} />

                      <div
                      style={{ flex: '1 1 0%' }}
                      className="min-w-0 bg-card shadow-sm flex flex-col overflow-hidden"
                      >
                      <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Generated YAML ({activeDesignerFile.name})</h2>
                      <div className="flex-grow overflow-hidden">
                          <YamlDisplay
                          yamlSegments={yamlSegments}
                          hoveredTaskId={hoveredTaskId}
                          onSetHoveredSegmentId={setHoveredTaskId}
                          />
                      </div>
                      </div>
                  </>
                  ) : (
                  <div className="flex items-center justify-center w-full text-muted-foreground">
                      <p>No file selected. Create one or open a YAML file from the project.</p>
                  </div>
                  )}
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="flex-1 flex flex-col min-h-0 rounded-b-lg overflow-hidden bg-card data-[state=inactive]:hidden">
              {activeEditorFile ? (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold font-code" title={activeEditorFile.path}>{activeEditorFile.path}</h2>
                      {activeEditorFile.isDefault && <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeEditorFile.isDefault && (
                         <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => handleAcceptFolder(activeEditorFile.path)}>
                                <Check className="w-4 h-4 mr-2" />
                                Accept File
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove the 'default' status, marking this as a permanent project file.</p>
                            </TooltipContent>
                          </Tooltip>
                      )}
                      <Button size="sm" onClick={handleSaveActiveEditorFile}>Save Changes</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(activeEditorFile.path, 'file')}>
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
                      placeholder={`Content for ${activeEditorFile.path}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Select a non-YAML file from the Project Explorer to edit.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Resizer onMouseDown={(e) => handleMouseDown("actionsPanel", e)} />

        {/* Actions Panel */}
        <div 
          style={{ flex: `0 0 ${actionsPanelWidth}px` }}
          className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col"
        >
          <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Actions</h2>
          <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-2">
                <Button onClick={() => projectZipRef.current?.click()} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Import Project (ZIP)
                </Button>
                <input type="file" ref={projectZipRef} onChange={handleImportZip} accept=".zip" className="hidden" />
                
                <Button onClick={handleExportZip} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <Archive className="w-3.5 h-3.5 mr-1.5" /> Export Project (ZIP)
                </Button>
                
                <Separator className="my-2"/>
                <Button onClick={handleCheckProject} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Check Project for Errors
                </Button>
                <Separator className="my-2"/>

                <Button onClick={handleNewFile} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <FilePlus className="w-3.5 h-3.5 mr-1.5" /> New File
                </Button>
                <Separator className="my-2"/>
                <Button onClick={handleValidatePlaybookClick} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Validate YAML File
                </Button>
                <input
                  type="file"
                  ref={playbookFileRef}
                  onChange={handlePlaybookFileChange}
                  accept=".yaml,.yml"
                  className="hidden"
                />
                <Button onClick={handleExportYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export Active File YAML
                </Button>
                <Button onClick={handleCopyYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <CopyIconLucide className="w-3.5 h-3.5 mr-1.5" />
                  Copy Active File YAML
                </Button>
                <Separator className="my-2"/>
                <Button onClick={() => inventoryFileRef.current?.click()} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Validate Inventory
                </Button>
                <input
                  type="file"
                  ref={inventoryFileRef}
                  onChange={handleInventoryFileChange}
                  accept=".ini,.yaml,.yml,.json,text/plain,inventory/*,hosts"
                  className="hidden"
                />
                <Button onClick={() => setIsInventoryVisualizerOpen(true)} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <EyeIcon className="w-3.5 h-3.5 mr-1.5" /> Visualize Inventory Graph
                </Button>
                <Separator className="my-2"/>
                <Button onClick={() => setIsManageRolesModalOpen(true)} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1 whitespace-nowrap">
                  <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage Roles
                </Button>
                <Separator className="my-2"/>
                <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary justify-start whitespace-nowrap">
                  <a href="https://galaxy.ansible.com/ui/collections/" target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Browse Ansible Galaxy
                  </a>
                </Button>
                <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary justify-start whitespace-nowrap">
                  <a href="https://docs.ansible.com/ansible/latest/os_guide/intro_windows.html" target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Manage Windows with Ansible
                  </a>
                </Button>
                <Separator className="my-2"/>
              </div>
          </ScrollArea>
        </div>

        {/* Modals */}
        <Dialog open={isProjectCheckModalOpen} onOpenChange={setIsProjectCheckModalOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-headline">Project Check Results</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                    {projectIssues.length > 0 ? (
                        <div className="space-y-4 p-1">
                            {projectIssues.map((issue, index) => (
                                <Card key={index}>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                                            {issue.error}
                                        </CardTitle>
                                        <CardDescription>
                                            <span className="font-semibold">Category:</span> {issue.category}
                                            {issue.path && <span className="font-mono bg-muted p-1 rounded-sm ml-2 text-xs">{issue.path}</span>}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">{issue.why}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">No issues found!</h3>
                            <p>Your project structure looks good based on our checks.</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <DialogTitle className="font-headline">Rename File</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="fileNameInput">File Name</Label>
              <Input
                id="fileNameInput"
                value={tempFileName}
                onChange={(e) => setTempFileName(e.target.value)}
                className="mt-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleRenameFile}>Save Name</Button>
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
    </TooltipProvider>
  );
}
