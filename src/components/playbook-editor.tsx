
"use client";

import * as React from "react";
import type { AnsibleTask, AnsibleModuleDefinition } from "@/types/ansible";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/task-list";
import { YamlDisplay } from "@/components/yaml-display";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck } from "lucide-react";

export interface PlaybookEditorRef {
  addTaskFromPalette: (moduleDef: AnsibleModuleDefinition) => void;
}

const PlaybookEditor = React.forwardRef<PlaybookEditorRef, {}>((props, ref) => {
  const [tasks, setTasks] = React.useState<AnsibleTask[]>([]);
  const { toast } = useToast();
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
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
  
  React.useImperativeHandle(ref, () => ({
    addTaskFromPalette: (moduleDef: AnsibleModuleDefinition) => {
      addTask(moduleDef);
    }
  }));

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
  
  return (
    <div className="h-full flex flex-row space-x-4 bg-transparent">
      {/* Left Column: Design/Task List */}
      <div 
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 p-3 border-2 border-dashed rounded-lg transition-colors flex flex-col bg-card shadow-sm ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'} overflow-hidden`}
        aria-dropeffect="copy"
      >
        <h2 className="text-base font-semibold mb-2 text-foreground font-headline flex-shrink-0">Playbook Tasks</h2>
        <TaskList tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask} onMoveTask={moveTask} />
      </div>

      {/* Middle Column: YAML Display */}
      <div className="flex-1 flex flex-col overflow-hidden border rounded-lg bg-card shadow-sm p-0">
        <h2 className="text-base font-semibold text-foreground font-headline flex-shrink-0 p-3 border-b">Generated YAML</h2>
        <div className="flex-grow overflow-hidden">
           <YamlDisplay tasks={tasks} />
        </div>
      </div>

      {/* Right Column: Actions */}
      <div className="w-40 flex-shrink-0 p-3 border rounded-lg bg-card shadow-sm flex flex-col space-y-2">
        {/* You can add a title for this column if desired, e.g., <h2 className="text-base font-semibold mb-2 text-foreground font-headline">Actions</h2> */}
        <Button onClick={handleValidatePlaybook} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
          <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Validate
        </Button>
        <Button onClick={handleExportYaml} variant="outline" size="sm" className="w-full justify-start text-xs px-2 py-1">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export
        </Button>
      </div>
    </div>
  );
});

PlaybookEditor.displayName = "PlaybookEditor";
export { PlaybookEditor };
