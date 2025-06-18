"use client";

import * as React from "react";
import { suggestAnsibleTask, type SuggestAnsibleTaskOutput } from "@/ai/flows/suggest-ansible-task";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wand2, PlusCircle, Loader2 } from "lucide-react";
import type { AnsibleTask } from "@/types/ansible";

interface AiAssistantProps {
  onTaskSuggested: (task: AnsibleTask) => void;
  currentPlaybookContext: string; 
}

export function AiAssistant({ onTaskSuggested, currentPlaybookContext }: AiAssistantProps) {
  const [description, setDescription] = React.useState("");
  const [suggestedTaskYaml, setSuggestedTaskYaml] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSuggestTask = async () => {
    if (!description.trim()) {
      toast({ title: "Error", description: "Please enter a task description.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSuggestedTaskYaml(null);
    try {
      const result: SuggestAnsibleTaskOutput = await suggestAnsibleTask({ description });
      setSuggestedTaskYaml(result.suggestedTask);
    } catch (error) {
      console.error("Error suggesting task:", error);
      toast({ title: "AI Error", description: "Failed to suggest task. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTaskToPlaybook = () => {
    if (suggestedTaskYaml) {
      const nameMatch = suggestedTaskYaml.match(/- name: (.*)/);
      const taskName = nameMatch && nameMatch[1] ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : "AI Suggested Task";
      
      const newTask: AnsibleTask = {
        id: crypto.randomUUID(),
        name: taskName,
        module: "ai_suggested", 
        parameters: {}, 
        rawYAML: suggestedTaskYaml,
        comment: "Task suggested by AI Assistant",
      };
      onTaskSuggested(newTask);
      setSuggestedTaskYaml(null); 
      setDescription(""); 
      toast({ title: "Task Added", description: `"${taskName}" added to playbook.` });
    }
  };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center font-headline text-lg">
          <Wand2 className="w-5 h-5 mr-2 text-accent" />
          AI Assistant
        </CardTitle>
        <CardDescription className="text-xs">Describe a task, and AI will suggest the Ansible YAML.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow flex flex-col">
        <div className="flex-grow">
          <Label htmlFor="task-description" className="font-medium text-sm">Task Description</Label>
          <Textarea
            id="task-description"
            placeholder="e.g., 'Install nginx and start the service'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 min-h-[100px] text-sm focus:ring-accent flex-grow"
            aria-label="Task description for AI suggestion"
          />
        </div>
        <Button onClick={handleSuggestTask} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm py-2">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Suggest Task
        </Button>

        {suggestedTaskYaml && (
          <div className="mt-3 p-3 border rounded-md bg-muted/30 max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-1 text-xs text-foreground">Suggested Task (YAML):</h4>
            <pre className="font-code bg-background p-2 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {suggestedTaskYaml}
            </pre>
            <Button onClick={handleAddTaskToPlaybook} className="mt-2 w-full text-xs py-1.5" variant="outline">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add to Playbook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
