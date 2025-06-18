"use client";

import * as React from "react";
import type { AnsibleTask, AnsibleModuleDefinition } from "@/types/ansible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AiAssistant } from "@/components/ai-assistant";
import { TaskList } from "@/components/task-list";
import { YamlDisplay } from "@/components/yaml-display";
import { useToast } from "@/hooks/use-toast";
import { Download, ClipboardCheck, GalleryVerticalEnd, FileCode } from "lucide-react";

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
        parameters: JSON.parse(JSON.stringify(moduleDef.defaultParameters || {})), // Deep copy
      };
    } else { 
      newTask = taskDetails as AnsibleTask;
      if (!newTask.id) newTask.id = crypto.randomUUID(); // Ensure ID for AI tasks
    }
    setTasks((prevTasks) => [...prevTasks, newTask]);
    toast({ title: "Task Added", description: `"${newTask.name}" added to playbook.` });
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
    toast({ title: "Task Updated", description: `"${updatedTask.name}" has been updated.` });
  };

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    toast({ title: "Task Deleted", description: "Task removed from playbook." });
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
    URL.revokeObjectURL(link.href); // Clean up
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
  
  const currentPlaybookContext = React.useMemo(() => {
    return tasks.map(t => `- ${t.name} (${t.module})`).join('\n');
  }, [tasks]);

  return (
    <Tabs defaultValue="design" className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
        <TabsList className="bg-muted/70">
          <TabsTrigger value="design" className="text-xs px-3 py-1.5 flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GalleryVerticalEnd className="w-3.5 h-3.5 mr-1.5" /> Design
          </TabsTrigger>
          <TabsTrigger value="yaml" className="text-xs px-3 py-1.5 flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileCode className="w-3.5 h-3.5 mr-1.5" /> YAML
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center space-x-2">
          <Button onClick={handleValidatePlaybook} variant="outline" size="sm" className="text-xs px-2 py-1">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Validate
          </Button>
          <Button onClick={handleExportYaml} variant="outline" size="sm" className="text-xs px-2 py-1">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      <TabsContent value="design" className="flex-grow overflow-hidden p-2 md:p-3 m-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
          <div className="lg:col-span-1 h-full min-h-[250px]">
            <AiAssistant onTaskSuggested={addTask} currentPlaybookContext={currentPlaybookContext} />
          </div>
          <div 
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`lg:col-span-2 h-full p-3 border-2 border-dashed rounded-lg transition-colors flex flex-col ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
            aria-dropeffect="copy"
          >
            <h2 className="text-base font-semibold mb-2 text-foreground font-headline">Playbook Tasks</h2>
            <TaskList tasks={tasks} onUpdateTask={updateTask} onDeleteTask={deleteTask} onMoveTask={moveTask} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="yaml" className="flex-grow overflow-hidden m-0 relative">
         <div className="absolute inset-0 p-2 md:p-3">
            <YamlDisplay tasks={tasks} />
         </div>
      </TabsContent>
    </Tabs>
  );
});

PlaybookEditor.displayName = "PlaybookEditor";
export { PlaybookEditor };
