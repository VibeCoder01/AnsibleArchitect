"use client";

import * as React from "react";
import type { AnsibleTask } from "@/types/ansible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Edit3, GripVertical, TerminalSquare, Package, Cog, Copy, FileText, FileJson2, Wand2 } from "lucide-react";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

interface TaskListProps {
  tasks: AnsibleTask[];
  onUpdateTask: (updatedTask: AnsibleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (dragIndex: number, hoverIndex: number) => void;
}

const moduleIcons: Record<string, React.ElementType> = {
  debug: TerminalSquare,
  apt: Package,
  service: Cog,
  copy: Copy,
  file: FileText,
  template: FileJson2,
  ai_suggested: Wand2,
  default: PuzzleIconInternal, // Using internal fallback
};

export function TaskList({ tasks, onUpdateTask, onDeleteTask, onMoveTask }: TaskListProps) {
  const [editingTask, setEditingTask] = React.useState<AnsibleTask | null>(null);
  const [tempParameters, setTempParameters] = React.useState<string>(""); // Store params as JSON string
  const [tempTaskName, setTempTaskName] = React.useState<string>("");
  const [isParamsJsonValid, setIsParamsJsonValid] = React.useState(true);

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onMoveTask(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  const openEditModal = (task: AnsibleTask) => {
    setEditingTask(task);
    setTempTaskName(task.name);
    setTempParameters(JSON.stringify(task.parameters, null, 2));
    setIsParamsJsonValid(true);
  };

  const handleParameterJsonChange = (value: string) => {
    setTempParameters(value);
    try {
      JSON.parse(value);
      setIsParamsJsonValid(true);
    } catch (e) {
      setIsParamsJsonValid(false);
    }
  };
  
  const handleSaveTask = () => {
    if (editingTask && isParamsJsonValid) {
      try {
        const parsedParameters = JSON.parse(tempParameters);
        onUpdateTask({ ...editingTask, name: tempTaskName, parameters: parsedParameters });
        setEditingTask(null);
      } catch (e) {
         // This should ideally not happen if isParamsJsonValid is true, but as a safeguard
        console.error("Error parsing parameters JSON on save:", e);
      }
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground flex-grow flex flex-col items-center justify-center">
        <PuzzleIconInternal className="w-12 h-12 mx-auto mb-3 opacity-60" />
        <p className="font-medium text-sm">Your playbook is empty.</p>
        <p className="text-xs">Drag modules here or use the AI Assistant.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full p-0.5">
      <div className="space-y-2">
        {tasks.map((task, index) => {
          const IconComponent = moduleIcons[task.module] || moduleIcons.default;
          return (
            <Card 
              key={task.id} 
              className="bg-card shadow-sm hover:shadow-md transition-shadow group relative"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="flex items-center p-3">
                <Button variant="ghost" size="icon" className="cursor-grab p-1 mr-2 h-auto touch-none" aria-label="Drag to reorder task">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
                <IconComponent className="w-5 h-5 text-primary flex-shrink-0 mr-2" />
                <div className="flex-grow">
                  <CardTitle className="text-sm font-medium text-card-foreground leading-tight">{task.name}</CardTitle>
                  <CardDescription className="text-xs">Module: {task.module}</CardDescription>
                </div>
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!task.rawYAML && (
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditModal(task)} aria-label="Edit task">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onDeleteTask(task.id)} aria-label="Delete task">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {task.rawYAML ? (
                 <CardContent className="px-3 pb-2 pt-0">
                    <pre className="font-code bg-muted/20 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                        {task.rawYAML}
                    </pre>
                 </CardContent>
              ) : (Object.keys(task.parameters).length > 0 || task.comment) && (
                <CardContent className="px-3 pb-2 pt-0 text-xs">
                  {task.comment && <p className="italic text-muted-foreground mb-1"># {task.comment}</p>}
                  {Object.keys(task.parameters).length > 0 && (
                    <details className="max-h-32 overflow-y-auto">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">Parameters</summary>
                      <ul className="text-xs space-y-0.5 mt-1 pl-2 border-l ml-1">
                        {Object.entries(task.parameters).map(([key, value]) => (
                          <li key={key} className="truncate"><span className="font-medium">{key}:</span> {String(value)}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Edit Task: {editingTask.module}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto px-1">
              <div>
                <Label htmlFor="taskNameEdit" className="font-medium">Task Name</Label>
                <Input 
                  id="taskNameEdit" 
                  value={tempTaskName} 
                  onChange={(e) => setTempTaskName(e.target.value)} 
                  className="mt-1 text-sm"
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="taskParamsEdit" className="font-medium">Parameters (JSON)</Label>
                <Textarea
                  id="taskParamsEdit"
                  value={tempParameters}
                  onChange={(e) => handleParameterJsonChange(e.target.value)}
                  className={`mt-1 font-code text-xs min-h-[150px] ${!isParamsJsonValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  placeholder='{ "key": "value", "another_key": true }'
                />
                {!isParamsJsonValid && <p className="text-xs text-destructive mt-1">Invalid JSON format.</p>}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveTask} disabled={!isParamsJsonValid}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ScrollArea>
  );
}

function PuzzleIconInternal(props: React.SVGProps<SVGSVGElement>) { // Internal fallback icon
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" {...props}>
      <path d="M19.439 7.561c-1.172-1.172-2.756-1.81-4.439-1.81s-3.267.638-4.439 1.81L7.56 10.561M16.561 19.439c1.172-1.172 1.81-2.756 1.81-4.439s-.638-3.267-1.81-4.439L10.56 7.561M4.561 16.561A6.25 6.25 0 0010.05 19.5a6.25 6.25 0 005.488-8.488M19.5 10.05a6.25 6.25 0 00-8.488-5.488"/>
    </svg>
  )
}
