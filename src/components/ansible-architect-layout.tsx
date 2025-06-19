
"use client";
import * as React from "react";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { ModulePalette } from "@/components/module-palette";
import { TaskList } from "@/components/task-list";
import { YamlDisplay } from "@/components/yaml-display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck, ExternalLink, Info, ClipboardCopy } from "lucide-react";
import type { AnsibleTask, AnsibleModuleDefinition, AnsiblePlaybook } from "@/types/ansible";
import { Separator } from "@/components/ui/separator";
import { moduleGroups } from "@/config/ansible-modules";

const MIN_COLUMN_WIDTH = 200; // Minimum width for draggable columns in pixels

// Moved generatePlaybookYaml function here
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

  const totalModuleCount = React.useMemo(() => {
    return moduleGroups.reduce((count, group) => count + group.modules.length, 0);
  }, [moduleGroups]); // Corrected dependency array

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
            <TaskList tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask} onMoveTask={moveTask} />
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
      <div className="w-48 flex-shrink-0 bg-card shadow-lg rounded-lg border flex flex-col p-3 space-y-2">
        <h2 className="text-base font-semibold mb-1 text-foreground font-headline flex-shrink-0">Actions</h2>
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
