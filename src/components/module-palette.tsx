
"use client";

import * as React from "react";
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search as SearchIcon, FolderOpen as PuzzleIcon } from "lucide-react"; 
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
          module.description.toLowerCase().includes(lowerSearchTerm) ||
          module.module.toLowerCase().includes(lowerSearchTerm)
        );
        return { ...group, modules: filteredModules };
      })
      .filter(group => group.modules.length > 0);
  }, [searchTerm, moduleGroups]);

  const defaultOpenGroups = searchTerm.trim() 
    ? filteredModuleGroups.map(g => g.name) 
    : []; 
  
  const searchPlaceholder = "Search modules...";

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex-shrink-0">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm w-full"
            aria-label="Search Ansible modules"
          />
        </div>
      </div>
      <ScrollArea className="flex-grow p-3">
        {filteredModuleGroups.length > 0 ? (
          <Accordion type="multiple" defaultValue={defaultOpenGroups} className="w-full space-y-1">
            {filteredModuleGroups.map((group) => {
              const GroupIcon = group.icon || PuzzleIcon;
              return (
                <AccordionItem value={group.name} key={group.name} className="border bg-card shadow-sm rounded-md overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 text-base hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <GroupIcon className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-card-foreground">{group.name}</span>
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
    </div>
  );
}
