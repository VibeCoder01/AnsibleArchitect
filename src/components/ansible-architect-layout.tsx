"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModulePalette } from "@/components/module-palette";
import { PlaybookEditor, type PlaybookEditorRef } from "@/components/playbook-editor";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { Separator } from "@/components/ui/separator";
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TerminalSquare, Package, Cog, Copy, FileText, FileJson2 } from "lucide-react";


// Re-define defaultModules here for collapsed view, or import if moved to a shared location
const defaultModulesForCollapsedView: Pick<AnsibleModuleDefinition, 'id' | 'name' | 'icon'>[] = [
  { id: 'debug', name: 'Debug Message', icon: TerminalSquare },
  { id: 'apt', name: 'APT Package', icon: Package },
  { id: 'service', name: 'Manage Service', icon: Cog },
  { id: 'copy', name: 'Copy File', icon: Copy },
  { id: 'file', name: 'Manage File/Directory', icon: FileText },
  { id: 'template', name: 'Template File', icon: FileJson2 },
];


export function AnsibleArchitectLayout() {
  const playbookEditorRef = React.useRef<PlaybookEditorRef>(null);

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
     if (playbookEditorRef.current) {
       playbookEditorRef.current.addTaskFromPalette(moduleDef);
     }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        variant="sidebar" 
        collapsible="icon" 
        className="border-r shadow-lg w-[280px] group-data-[collapsible=icon]:w-[56px] transition-all duration-200 ease-in-out flex flex-col"
        side="left"
      >
        <SidebarHeader className="p-3 flex items-center space-x-2.5 flex-shrink-0">
          <AnsibleArchitectIcon className="w-7 h-7 text-primary group-data-[collapsible=icon]:mx-auto" />
          <h1 className="text-xl font-bold font-headline text-primary group-data-[collapsible=icon]:hidden">Ansible Architect</h1>
          <div className="ml-auto group-data-[collapsible=icon]:hidden">
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <Separator className="group-data-[collapsible=icon]:hidden flex-shrink-0" />
        <SidebarContent className="p-0 group-data-[collapsible=icon]:p-0 overflow-hidden flex-grow">
          <div className="h-full group-data-[collapsible=icon]:hidden">
            <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
          </div>
           <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center space-y-1 p-1 mt-2">
            {defaultModulesForCollapsedView.map(mod => {
              const Icon = mod.icon || TerminalSquare; // Fallback if icon is not defined
              return (
                <Tooltip key={mod.id}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-10 h-10 hover:bg-sidebar-accent"
                      onClick={() => handleAddTaskFromPalette(mod as AnsibleModuleDefinition)} // Quick add, needs full def
                      aria-label={`Add ${mod.name}`}
                    >
                      <Icon className="w-5 h-5 text-sidebar-foreground hover:text-sidebar-accent-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-sans">
                    <p>Add {mod.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </SidebarContent>
        <Separator className="group-data-[collapsible=icon]:hidden flex-shrink-0"/>
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden flex-shrink-0">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Ansible Architect</p>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="flex-1 overflow-auto">
        <PlaybookEditor ref={playbookEditorRef} />
      </SidebarInset>
    </div>
  );
}
