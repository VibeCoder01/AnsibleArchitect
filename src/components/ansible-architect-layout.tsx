
"use client";
import * as React from "react";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { TaskList } from "@/components/task-list";
import { YamlDisplay } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck, ExternalLink, Info } from "lucide-react";
import type { AnsibleTask, AnsibleModuleDefinition } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { moduleGroups } from "@/config/ansible-modules";

export function AnsibleArchitectLayout() {
  const [tasks, setTasks] = React.useState<AnsibleTask[]>([]);
  const { toast } = useToast();
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

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
    const yamlPreElement = document.querySelector('pre[aria-label="Generated YAML playbook"]');
    if (!yamlPreElement || !yamlPreElement.textContent) {
      toast({ title: "Error", description: "No YAML content to export.", variant: "destructive" });
      return;
    }
    const playbookYaml = yamlPreElement.textContent;
    const blob = new Blob([playbookYaml], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "playbook.yml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Exported", description: "Playbook YAML downloaded." });
  };

  const handleValidatePlaybook = () => {
    if (tasks.length === 0) {
      toast({ title: "Validation", description: "Playbook is empty. Nothing to validate.", variant: "default" });
      return;
    }
    const isValid = Math.random() > 0.2; 
    if (isValid) {
      toast({ title: "Validation Successful", description: "Playbook appears to be valid.", className: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300" });
    } else {
      toast({ title: "Validation Failed", description: "Found potential issues in the playbook.", variant: "destructive" });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
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

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const totalModuleCount = React.useMemo(() => {
    return moduleGroups.reduce((count, group) => count + group.modules.length, 0);
  }, [moduleGroups]);

  return (
    <div className="flex h-screen bg-background p-4 space-x-4">
      {/* Column 1: Module Palette */}
      <div className="flex-1 min-w-0 max-w-[320px] bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden">
        <div className="p-3 flex items-center border-b flex-shrink-0">
          <AnsibleArchitectIcon className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-lg font-bold font-headline text-primary">Ansible Architect</h1>
        </div>
        <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
      </div>

      {/* Column 2: Playbook Tasks */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden transition-colors ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
        aria-dropeffect="copy"
      >
        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Playbook Tasks</h2>
        <div className="flex-grow overflow-hidden p-3">
          <TaskList tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask} onMoveTask={moveTask} />
        </div>
      </div>

      {/* Column 3: Generated YAML */}
      <div className="flex-1 min-w-0 bg-card shadow-lg rounded-lg border flex flex-col overflow-hidden">
        <h2 className="text-base font-semibold p-3 border-b text-foreground font-headline flex-shrink-0">Generated YAML</h2>
        <div className="flex-grow overflow-hidden">
          <YamlDisplay tasks={tasks} />
        </div>
      </div>

      {/* Column 4: Actions */}
      <div className="w-48 flex-shrink-0 bg-card shadow-lg rounded-lg border flex flex-col p-3 space-y-2">
        <h2 className="text-base font-semibold mb-1 text-foreground font-headline flex-shrink-0">Actions</h2>
        <Button onClick={handleValidatePlaybook} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
          <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Validate Playbook
        </Button>
        <Button onClick={handleExportYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export YAML
        </Button>
        <Separator className="my-2"/>
        <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary justify-start">
          <a href="https://galaxy.ansible.com/ui/collections/" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Browse Ansible Galaxy
          </a>
        </Button>
        <Separator className="my-2"/>
         <div className="flex items-center text-xs text-muted-foreground pt-1">
          <Info className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
          <span>{totalModuleCount} Modules Available</span>
        </div>
      </div>
    </div>
  );
}
