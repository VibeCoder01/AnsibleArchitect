
"use client";

import * as React from "react";
import type { AnsibleModuleDefinition, AnsibleModuleGroup } from "@/types/ansible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { moduleGroups } from "@/config/ansible-modules";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ModulePaletteProps {
  onAddTaskFromPalette: (module: AnsibleModuleDefinition) => void;
}

export function ModulePalette({ onAddTaskFromPalette }: ModulePaletteProps) {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, module: AnsibleModuleDefinition) => {
    event.dataTransfer.setData("application/json", JSON.stringify(module));
    event.dataTransfer.effectAllowed = "copy";
  };

  const defaultOpenGroups = ["File Management", "Package Management", "System & Services"];

  return (
    <Card className="h-full flex flex-col shadow-md border-0 rounded-none">
      <CardHeader className="p-3 border-b flex-shrink-0">
        <CardTitle className="text-base font-headline">Available Modules</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <Accordion type="multiple" defaultValue={defaultOpenGroups} className="w-full p-3 space-y-1">
            {moduleGroups.map((group) => {
              const GroupIcon = group.icon || PuzzleIcon;
              return (
                <AccordionItem value={group.name} key={group.name} className="border bg-card shadow-sm rounded-md overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <GroupIcon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-card-foreground">{group.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-background/20">
                    <div className="space-y-2 p-3 border-t">
                      {group.modules.map((module) => {
                        const IconComponent = module.icon || PuzzleIcon; // Fallback Icon
                        return (
                          <div
                            key={module.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, module)}
                            className="p-2.5 border rounded-md bg-card hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing flex items-center justify-between group"
                            aria-label={`Draggable module: ${module.name}`}
                          >
                            <div className="flex items-center space-x-2">
                              <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-sm text-card-foreground">{module.name}</h4>
                                <p className="text-xs text-muted-foreground leading-tight">{module.description}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7"
                              onClick={() => onAddTaskFromPalette(module)}
                              aria-label={`Add ${module.name} module`}
                            >
                              <PlusCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PuzzleIcon(props: React.SVGProps<SVGSVGElement>) { 
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" {...props}>
      <path d="M19.439 7.561c-1.172-1.172-2.756-1.81-4.439-1.81s-3.267.638-4.439 1.81L7.56 10.561M16.561 19.439c1.172-1.172 1.81-2.756 1.81-4.439s-.638-3.267-1.81-4.439L10.56 7.561M4.561 16.561A6.25 6.25 0 0010.05 19.5a6.25 6.25 0 005.488-8.488M19.5 10.05a6.25 6.25 0 00-8.488-5.488"/>
    </svg>
  )
}
