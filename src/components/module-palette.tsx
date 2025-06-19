
"use client";

import * as React from "react";
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, ExternalLink, Search as SearchIcon } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, module: AnsibleModuleDefinition) => {
    event.dataTransfer.setData("application/json", JSON.stringify(module));
    event.dataTransfer.effectAllowed = "copy";
  };

  const filteredModuleGroups = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return moduleGroups;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return moduleGroups
      .map(group => {
        const filteredModules = group.modules.filter(module =>
          module.name.toLowerCase().includes(lowerSearchTerm) ||
          module.description.toLowerCase().includes(lowerSearchTerm)
        );
        return { ...group, modules: filteredModules };
      })
      .filter(group => group.modules.length > 0);
  }, [searchTerm]);

  const defaultOpenGroups = searchTerm.trim() 
    ? filteredModuleGroups.map(g => g.name) // Open all groups when searching
    : ["File Management", "Package Management", "System & Services"];

  return (
    <Card className="h-full flex flex-col shadow-md border-0 rounded-none">
      <CardHeader className="p-3 border-b flex-shrink-0">
        <CardTitle className="text-base font-headline">Available Modules</CardTitle>
        <div className="relative mt-2">
          <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
            aria-label="Search Ansible modules"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          {filteredModuleGroups.length > 0 ? (
            <Accordion type="multiple" defaultValue={defaultOpenGroups} className="w-full p-3 space-y-1">
              {filteredModuleGroups.map((group) => {
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
                          const IconComponent = module.icon || PuzzleIcon; 
                          return (
                            <div
                              key={module.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, module)}
                              className="p-2.5 border rounded-md bg-card hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing flex items-center justify-between group"
                              aria-label={`Draggable module: ${module.name}`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm text-card-foreground truncate" title={module.name}>{module.name}</h4>
                                  <p className="text-xs text-muted-foreground leading-tight truncate" title={module.description}>{module.description}</p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex-shrink-0"
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
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>No modules found matching "{searchTerm}".</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t flex-shrink-0">
        <Button variant="link" asChild className="text-xs p-0 h-auto text-muted-foreground hover:text-primary">
          <a href="https://galaxy.ansible.com/ui/collections/" target="_blank" rel="noopener noreferrer" className="flex items-center">
            Browse Ansible Galaxy <ExternalLink className="w-3 h-3 ml-1.5" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Default/fallback icon if a module-specific one isn't defined
function PuzzleIcon(props: React.SVGProps<SVGSVGElement>) { 
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" {...props}>
      <path d="M19.439 7.561c-1.172-1.172-2.756-1.81-4.439-1.81s-3.267.638-4.439 1.81L7.56 10.561M16.561 19.439c1.172-1.172 1.81-2.756 1.81-4.439s-.638-3.267-1.81-4.439L10.56 7.561M4.561 16.561A6.25 6.25 0 0010.05 19.5a6.25 6.25 0 005.488-8.488M19.5 10.05a6.25 6.25 0 00-8.488-5.488"/>
    </svg>
  )
}
