
"use client";
import * as React from "react";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { TaskList } from "@/components/task-list";
import { YamlDisplay, type YamlSegment } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck, ExternalLink, Settings, Trash2, PlusCircle, ClipboardCopy, X, FilePlus, Save, Edit2 } from "lucide-react";
import * as yaml from "js-yaml";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybookYAML, AnsibleRoleRef, PlaybookState } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MIN_COLUMN_WIDTH = 200; // Minimum width for draggable columns in pixels
const LOCAL_STORAGE_PLAYBOOKS_KEY = "ansibleArchitectPlaybooks";
const LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY = "ansibleArchitectActivePlaybookId";

function generatePlaybookYamlSegments(tasks: AnsibleTask[], playbookName: string): YamlSegment[] {
  const segments: YamlSegment[] = [];
  const playbookStructure: AnsiblePlaybookYAML = [
    {
      id: "play1", // This could be dynamic if supporting multiple plays per file
      name: playbookName,
      hosts: "all", // This could also be part of PlaybookState
      become: true,  // This could also be part of PlaybookState
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

export function AnsibleArchitectLayout() {
  const [playbooks, setPlaybooks] = React.useState<PlaybookState[]>([]);
  const [activePlaybookId, setActivePlaybookId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [isDraggingOverTaskList, setIsDraggingOverTaskList] = React.useState(false);

  const [col1Width, setCol1Width] = React.useState(350);
  const [col2Width, setCol2Width] = React.useState(350);

  const [draggingResizer, setDraggingResizer] = React.useState<"col1" | "col2" | null>(null);
  const [startX, setStartX] = React.useState(0);
  const [initialCol1W, setInitialCol1W] = React.useState(0);
  const [initialCol2W, setInitialCol2W] = React.useState(0);

  const [definedRoles, setDefinedRoles] = React.useState<AnsibleRoleRef[]>([]);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState("");

  const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [renamingPlaybookId, setRenamingPlaybookId] = React.useState<string | null>(null);
  const [tempPlaybookName, setTempPlaybookName] = React.useState("");

  // Load playbooks from localStorage on initial mount
  React.useEffect(() => {
    const storedPlaybooks = localStorage.getItem(LOCAL_STORAGE_PLAYBOOKS_KEY);
    const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY);
    if (storedPlaybooks) {
      const parsedPlaybooks = JSON.parse(storedPlaybooks);
      if (parsedPlaybooks.length > 0) {
        setPlaybooks(parsedPlaybooks);
        if (storedActiveId && parsedPlaybooks.some((p: PlaybookState) => p.id === storedActiveId)) {
          setActivePlaybookId(storedActiveId);
        } else {
          setActivePlaybookId(parsedPlaybooks[0].id);
        }
        return;
      }
    }
    // If no stored playbooks or empty, create a default one
    const defaultPlaybook = createNewPlaybook("Default Playbook");
    setPlaybooks([defaultPlaybook]);
    setActivePlaybookId(defaultPlaybook.id);
  }, []);

  // Save playbooks to localStorage whenever they change
  React.useEffect(() => {
    if (playbooks.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_PLAYBOOKS_KEY, JSON.stringify(playbooks));
    }
    if (activePlaybookId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PLAYBOOK_ID_KEY, activePlaybookId);
    }
  }, [playbooks, activePlaybookId]);

  const getActivePlaybook = React.useCallback(() => {
    return playbooks.find(p => p.id === activePlaybookId);
  }, [playbooks, activePlaybookId]);

  const updateActivePlaybook = React.useCallback((updatedPlaybook: Partial<PlaybookState>) => {
    setPlaybooks(prev =>
      prev.map(p => (p.id === activePlaybookId ? { ...p, ...updatedPlaybook } : p))
    );
  }, [activePlaybookId]);


  const activePlaybook = getActivePlaybook();
  const yamlSegments = React.useMemo(() => {
    if (!activePlaybook) return [];
    return generatePlaybookYamlSegments(activePlaybook.tasks, activePlaybook.name);
  }, [activePlaybook]);

  const fullYamlContent = React.useMemo(() => yamlSegments.map(segment => segment.content).join(''), [yamlSegments]);

  const addTaskToActivePlaybook = (taskDetails: AnsibleModuleDefinition | AnsibleTask) => {
    if (!activePlaybookId) return;
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
    setPlaybooks(prevPlaybooks =>
      prevPlaybooks.map(p =>
        p.id === activePlaybookId ? { ...p, tasks: [...p.tasks, newTask] } : p
      )
    );
  };

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
    addTaskToActivePlaybook(moduleDef);
  };

  const updateTaskInActivePlaybook = (updatedTask: AnsibleTask) => {
    if (!activePlaybookId) return;
    setPlaybooks(prevPlaybooks =>
      prevPlaybooks.map(p =>
        p.id === activePlaybookId
          ? { ...p, tasks: p.tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)) }
          : p
      )
    );
  };

  const deleteTaskInActivePlaybook = (taskId: string) => {
    if (!activePlaybookId) return;
    setPlaybooks(prevPlaybooks =>
      prevPlaybooks.map(p =>
        p.id === activePlaybookId
          ? { ...p, tasks: p.tasks.filter(task => task.id !== taskId) }
          : p
      )
    );
  };

  const moveTaskInActivePlaybook = (dragIndex: number, hoverIndex: number) => {
    if (!activePlaybookId) return;
    setPlaybooks(prevPlaybooks =>
      prevPlaybooks.map(p => {
        if (p.id === activePlaybookId) {
          const newTasks = [...p.tasks];
          const [draggedItem] = newTasks.splice(dragIndex, 1);
          newTasks.splice(hoverIndex, 0, draggedItem);
          return { ...p, tasks: newTasks };
        }
        return p;
      })
    );
  };

  const handleExportYaml = () => {
    if (!fullYamlContent) {
      toast({ title: "Error", description: "No YAML content to export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([fullYamlContent], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activePlaybook?.name.replace(/\s+/g, '_') || 'playbook'}.yml`;
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

  const handleValidatePlaybook = () => {
    if (!activePlaybook || activePlaybook.tasks.length === 0) {
      toast({
        title: "Validation",
        description: "Active playbook is empty. Nothing to validate.",
        variant: "default",
      });
      return;
    }
    try {
      yaml.load(fullYamlContent);
      toast({
        title: "Validation Successful",
        description: `YAML syntax for ${activePlaybook.name} is valid.`,
        className:
          "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: `Invalid YAML syntax for ${activePlaybook.name}.`,
        variant: "destructive",
      });
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

  const handleMouseDown = (resizerId: "col1" | "col2", event: React.MouseEvent) => {
    event.preventDefault();
    setDraggingResizer(resizerId);
    setStartX(event.clientX);
    setInitialCol1W(col1Width);
    setInitialCol2W(col2Width);
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
    }
  }, [draggingResizer, startX, initialCol1W, initialCol2W]);

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

  const handleClosePlaybook = (playbookIdToClose: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent tab activation when clicking close
    setPlaybooks(prev => {
      const remainingPlaybooks = prev.filter(p => p.id !== playbookIdToClose);
      if (remainingPlaybooks.length === 0) {
        const newDefault = createNewPlaybook("Default Playbook");
        setActivePlaybookId(newDefault.id);
        return [newDefault];
      }
      if (activePlaybookId === playbookIdToClose) {
        setActivePlaybookId(remainingPlaybooks[0].id);
      }
      return remainingPlaybooks;
    });
    const closedPlaybook = playbooks.find(p => p.id === playbookIdToClose);
    toast({ title: "Playbook Closed", description: `"${closedPlaybook?.name || 'Playbook'}" closed.`});
  };

  const openRenameModal = (playbookId: string, currentName: string, event: React.MouseEvent) => {
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

  if (!activePlaybook) {
     // This can happen briefly during initialization or if all playbooks are closed and a new one is being created.
     return <div className="flex h-screen items-center justify-center">Loading playbooks...</div>;
  }

  return (
    <div className="flex h-screen bg-background p-4 space-x-4">
      {/* Container for the first 3 resizable columns */}
      <div className="flex flex-1 min-w-0">
        {/* Column 1: Module Palette */}
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

        {/* Tabbed Area for Playbook Tasks and YAML */}
        <Tabs value={activePlaybookId || ""} onValueChange={setActivePlaybookId} className="flex flex-col min-w-0" style={{ flex: `0 0 calc(${col2Width}px + ${MIN_COLUMN_WIDTH}px + 0.5rem)` }}> {/* Width of 2nd col + 3rd col + resizer */}
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
                    variant="ghost" 
                    size="icon" 
                    className="w-5 h-5 ml-1.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20"
                    onClick={(e) => openRenameModal(p.id, p.name, e)}
                    aria-label="Rename playbook"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-5 h-5 ml-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20"
                    onClick={(e) => handleClosePlaybook(p.id, e)}
                    aria-label="Close playbook"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="ghost" size="icon" className="ml-1 w-7 h-7" onClick={handleNewPlaybook} aria-label="New Playbook">
              <FilePlus className="w-4 h-4" />
            </Button>
          </div>

          {playbooks.map(p => (
            <TabsContent key={p.id} value={p.id} className="flex-grow flex min-w-0 mt-0 rounded-b-lg overflow-hidden">
              {/* Column 2: Playbook Tasks */}
              <div
                style={{ flex: `0 0 ${col2Width}px` }}
                onDrop={handleDropOnTaskList}
                onDragOver={handleDragOverTaskList}
                onDragLeave={handleDragLeaveTaskList}
                className={`min-w-0 bg-card shadow-sm border-r flex flex-col overflow-hidden transition-colors ${isDraggingOverTaskList ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
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
                    hoveredTaskId={hoveredTaskId}
                    onSetHoveredTaskId={setHoveredTaskId}
                  />
                </div>
              </div>

              <Resizer onMouseDown={(e) => handleMouseDown("col2", e)} />

              {/* Column 3: Generated YAML */}
              <div
                style={{ flex: '1 1 0%' }} // This column will take remaining space from the Tab's allocated width
                className="min-w-0 bg-card shadow-sm flex flex-col overflow-hidden"
              >
                <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Generated YAML ({p.name})</h2>
                <div className="flex-grow overflow-hidden">
                  <YamlDisplay 
                    yamlSegments={p.id === activePlaybookId ? yamlSegments : generatePlaybookYamlSegments(p.tasks, p.name)} 
                    hoveredTaskId={hoveredTaskId}
                    onSetHoveredSegmentId={setHoveredTaskId}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Column 4: Actions (Fixed Width) */}
      <div className="w-64 flex-shrink-0 bg-card shadow-lg rounded-lg border flex flex-col">
        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Actions</h2>
        <div className="p-3 space-y-2">
          <Button onClick={handleNewPlaybook} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <FilePlus className="w-3.5 h-3.5 mr-1.5" /> New Playbook
          </Button>
          <Separator className="my-2"/>
          <Button onClick={handleValidatePlaybook} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Validate Playbook
          </Button>
          <Button onClick={handleExportYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export YAML
          </Button>
          <Button onClick={handleCopyYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
            <ClipboardCopy className="w-3.5 h-3.5 mr-1.5" /> Copy YAML
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

      {/* Manage Roles Modal */}
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

       {/* Rename Playbook Modal */}
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
    </div>
  );
}
