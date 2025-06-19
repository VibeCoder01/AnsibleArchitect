
"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { ModulePalette } from "@/components/module-palette";
import { PlaybookEditor, type PlaybookEditorRef } from "@/components/playbook-editor";
import { AnsibleArchitectIcon } from "@/components/icons/ansible-architect-icon";
import { Separator } from "@/components/ui/separator";
import type { AnsibleModuleDefinition } from "@/types/ansible";
// import { Button } from "./ui/button"; // No longer needed for collapsed view
// import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip"; // No longer needed for collapsed view
// import { defaultModules } from "@/config/ansible-modules"; // No longer needed for collapsed view specific logic

// const collapsedModuleIds: string[] = ['debug', 'apt', 'service', 'copy', 'file', 'user', 'command', 'git'];
// const defaultModulesForCollapsedView: AnsibleModuleDefinition[] = defaultModules.filter(mod => collapsedModuleIds.includes(mod.id));


export function AnsibleArchitectLayout() {
  const playbookEditorRef = React.useRef<PlaybookEditorRef>(null);

  const handleAddTaskFromPalette = (moduleDef: AnsibleModuleDefinition) => {
     if (playbookEditorRef.current) {
       playbookEditorRef.current.addTaskFromPalette(moduleDef);
     }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        variant="sidebar" 
        collapsible="none" 
        className="border-r shadow-lg w-[280px] flex flex-col" // Width is fixed, no transition classes needed based on collapse
        side="left"
      >
        {/* SidebarRail removed as sidebar is not collapsible/resizable by user */}
        <SidebarHeader className="p-3 flex items-center flex-shrink-0"> {/* Removed justify-between */}
          <div className="flex items-center space-x-2.5">
            <AnsibleArchitectIcon className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold font-headline text-primary">Ansible Architect</h1> {/* Removed group-data class */}
          </div>
          {/* SidebarTrigger removed */}
        </SidebarHeader>
        <Separator className="flex-shrink-0" /> {/* Removed group-data class */}
        <SidebarContent className="p-0 overflow-hidden flex-grow"> {/* Removed group-data class */}
          <div className="h-full"> {/* Removed group-data class */}
            <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
          </div>
           {/* Collapsed view for modules removed */}
        </SidebarContent>
        <Separator className="flex-shrink-0"/> {/* Removed group-data class */}
        <SidebarFooter className="p-3 flex-shrink-0"> {/* Removed group-data class */}
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Ansible Architect</p>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="flex-1 overflow-auto bg-background p-4">
        <PlaybookEditor ref={playbookEditorRef} />
      </SidebarInset>
    </div>
  );
}
