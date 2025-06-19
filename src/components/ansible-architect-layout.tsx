
"use client";
import * as React from "react";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { TaskList } from "@/components/task-list";
import { YamlDisplay } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck, ExternalLink, Info, ClipboardCopy, Settings, Trash2, PlusCircle } from "lucide-react";
import * as yaml from "js-yaml";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybook, AnsibleRoleRef } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";


const MIN_COLUMN_WIDTH = 200; // Minimum width for draggable columns in pixels

function generatePlaybookYaml(tasks: AnsibleTask[]): string {
  const playbook: AnsiblePlaybook = [
    {
      id: "play1",
      name: "Generated Playbook",
      hosts: "all",
      become: true,
      tasks: tasks,
    },
  ];

  let yamlString = "";
  playbook.forEach(play => {
    yamlString += `- name: ${play.name}\n`;
    yamlString += `  hosts: ${play.hosts}\n`;
    if (play.become !== undefined) {
      yamlString += `  become: ${play.become ? 'yes' : 'no'}\n`;
    }
    if (play.tasks.length > 0) {
      yamlString += `  tasks:\n`;
      play.tasks.forEach(task => {
        if (task.rawYAML) {
          const lines = task.rawYAML.trim().split('\n');
          lines.forEach((line, index) => {
            if (index === 0 && !line.trim().startsWith('-')) {
               yamlString += `    - ${line.trim()}\n`;
            } else if (index === 0 && line.trim().startsWith('-')) {
               yamlString += `    ${line.trim()}\n`;
            }
            else {
               yamlString += `      ${line.trim()}\n`;
            }
          });
        } else {
          yamlString += `    - name: "${task.name.replace(/"/g, '\\"')}"\n`;
          if (task.comment) {
            yamlString += `      # ${task.comment}\n`;
          }
          yamlString += `      ${task.module}:\n`;
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
            yamlString += `        ${key}: ${formattedValue}\n`;
          });
        }
        yamlString += "\n";
      });
    } else {
      yamlString += "  tasks: []\n\n";
    }
  });
  return yamlString.trim();
}


export function AnsibleArchitectLayout() {
  const [tasks, setTasks] = React.useState<AnsibleTask[]>([]);
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

  const yamlContent = React.useMemo(() => generatePlaybookYaml(tasks), [tasks]);

  const addTask = (taskDetails: AnsibleModuleDefinition | AnsibleTask) => {
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
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
    addTask(moduleDef);
  };

  const updateTask = (updatedTask: AnsibleTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  const moveTask = (dragIndex: number, hoverIndex: number) => {
    setTasks((prevTasks) => {
      const newTasks = [...prevTasks];
      const [draggedItem] = newTasks.splice(dragIndex, 1);
      newTasks.splice(hoverIndex, 0, draggedItem);
      return newTasks;
    });
  };

  const handleExportYaml = () => {
    if (!yamlContent) {
      toast({ title: "Error", description: "No YAML content to export.", variant: "destructive" });
      return;
    }
    const blob = new Blob([yamlContent], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "playbook.yml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Exported", description: "Playbook YAML downloaded." });
  };

  const handleCopyYaml = async () => {
    if (!yamlContent || yamlContent.trim() === "" || yamlContent.trim() === "# Add tasks to see YAML output here") {
      toast({ title: "Nothing to Copy", description: "Generated YAML is empty.", variant: "default" });
      return;
    }
    try {
      await navigator.clipboard.writeText(yamlContent);
      toast({ title: "Copied", description: "YAML copied to clipboard." });
    } catch (err) {
      console.error("Failed to copy YAML: ", err);
      toast({ title: "Error", description: "Failed to copy YAML to clipboard.", variant: "destructive" });
    }
  };

  const handleValidatePlaybook = () => {
    if (tasks.length === 0) {
      toast({
        title: "Validation",
        description: "Playbook is empty. Nothing to validate.",
        variant: "default",
      });
      return;
    }

    try {
      yaml.load(yamlContent);
      toast({
        title: "Validation Successful",
        description: "YAML syntax is valid.",
        className:
          "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Invalid YAML syntax.",
        variant: "destructive",
      });
    }
  };

  const handleDropOnTaskList = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverTaskList(false);
    try {
      const moduleDataString = event.dataTransfer.getData("application/json");
      if (moduleDataString) {
        const moduleDefinition: AnsibleModuleDefinition = JSON.parse(moduleDataString);
        addTask(moduleDefinition);
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

        {/* Column 2: Playbook Tasks */}
        <div
          style={{ flex: `0 0 ${col2Width}px` }}
          onDrop={handleDropOnTaskList}
          onDragOver={handleDragOverTaskList}
          onDragLeave={handleDragLeaveTaskList}
          className={`min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden transition-colors ${isDraggingOverTaskList ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          aria-dropeffect="copy"
        >
          <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Playbook Tasks</h2>
          <div className="flex-grow overflow-hidden p-3">
            <TaskList
              tasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
              definedRoles={definedRoles}
            />
          </div>
        </div>

        <Resizer onMouseDown={(e) => handleMouseDown("col2", e)} />

        {/* Column 3: Generated YAML */}
        <div
          style={{ flex: '1 1 0%' }}
          className="min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden"
        >
          <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Generated YAML</h2>
          <div className="flex-grow overflow-hidden">
            <YamlDisplay yamlContent={yamlContent} />
          </div>
        </div>
      </div>

      {/* Column 4: Actions (Fixed Width) */}
      <div className="w-48 flex-shrink-0 bg-card shadow-lg rounded-lg border flex flex-col">
         <div className="p-3 border-b flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground font-headline">Actions</h2>
        </div>
        <div className="p-3 space-y-2">
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
            <a href="https://docs.ansible.com/ansible/latest/user_guide/windows_intro.html" target="_blank" rel="noopener noreferrer" className="flex items-center">
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
    </div>
  );
}
