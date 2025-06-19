
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
        className="border-r shadow-lg w-[320px] flex flex-col flex-shrink-0 relative"
        side="left"
      >
        <SidebarHeader className="p-3 flex items-center flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <AnsibleArchitectIcon className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold font-headline text-primary">Ansible Architect</h1>
          </div>
        </SidebarHeader>
        <Separator className="flex-shrink-0" />
        <SidebarContent className="p-0 overflow-hidden flex-grow">
          <div className="h-full">
            <ModulePalette onAddTaskFromPalette={handleAddTaskFromPalette} />
          </div>
        </SidebarContent>
        <Separator className="flex-shrink-0"/>
        <SidebarFooter className="p-3 flex-shrink-0">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Ansible Architect</p>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="flex-1 overflow-auto bg-background p-4">
        <PlaybookEditor ref={playbookEditorRef} />
      </SidebarInset>
    </div>
  );
}
