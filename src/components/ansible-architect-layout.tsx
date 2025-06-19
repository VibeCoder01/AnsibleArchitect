
"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarRail, // Added SidebarRail import
} from "@/components/ui/sidebar";
import { ModulePalette } from "@/components/module-palette";
import { PlaybookEditor, type PlaybookEditorRef } from "@/components/playbook-editor";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { Separator } from "@/components/ui/separator";
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip"; 
import { defaultModules } from "@/config/ansible-modules"; 

const collapsedModuleIds: string[] = ['debug', 'apt', 'service', 'copy', 'file', 'user', 'command', 'git'];
const defaultModulesForCollapsedView: AnsibleModuleDefinition[] = defaultModules.filter(mod => collapsedModuleIds.includes(mod.id));


export function AnsibleArchitectLayout() {
  const playbookEditorRef = React.useRef<PlaybookEditorRef>(null);

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
     if (playbookEditorRef.current) {
       playbookEditorRef.current.addTaskFromPalette(moduleDef);
     }
  };

  return (
    <div className="flex h-screen bg-background"> {/* REMOVED overflow-hidden */}
      <Sidebar
        variant="sidebar" 
        collapsible="icon" 
        className="border-r shadow-lg w-[280px] group-data-[collapsible=icon]:w-[56px] transition-all duration-200 ease-in-out flex flex-col"
        side="left"
      >
        <SidebarRail /> {/* ADDED SidebarRail */}
        <SidebarHeader className="p-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <AnsibleArchitectIcon className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold font-headline text-primary group-data-[collapsible=icon]:hidden">Ansible Architect</h1>
          </div>
          <SidebarTrigger />
        </SidebarHeader>
        <Separator className="group-data-[collapsible=icon]:hidden flex-shrink-0" />
        <SidebarContent className="p-0 group-data-[collapsible=icon]:p-0 overflow-hidden flex-grow">
          <div className="h-full group-data-[collapsible=icon]:hidden">
            <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
          </div>
           <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center space-y-1 p-1 mt-2">
            {defaultModulesForCollapsedView.map(mod => {
              const Icon = mod.icon; 
              return (
                <Tooltip key={mod.id}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-10 h-10 hover:bg-sidebar-accent"
                      onClick={() => handleAddTaskFromPalette(mod)} 
                      aria-label={`Add ${mod.name}`}
                    >
                      {Icon ? <Icon className="w-5 h-5 text-sidebar-foreground hover:text-sidebar-accent-foreground" /> : <span className="text-xs">MOD</span>}
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
      
      <SidebarInset className="flex-1 overflow-auto bg-background"> {/* REMOVED pl-4 */}
        <PlaybookEditor ref={playbookEditorRef} />
      </SidebarInset>
    </div>
  );
}
