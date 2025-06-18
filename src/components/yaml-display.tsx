"use client";

import * as React from "react";
import type { AnsibleTask, AnsiblePlaybook } from "@/types/ansible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface YamlDisplayProps {
  tasks: AnsibleTask[]; 
}

function generatePlaybookYaml(tasks: AnsibleTask[]): string {
  const playbook: AnsiblePlaybook = [
    {
      id: "play1",
      name: "Generated Playbook",
      hosts: "all", 
      become: true,   
      tasks: tasks,
    },
  ];

  let yamlString = "";
  playbook.forEach(play => {
    yamlString += `- name: ${play.name}\n`;
    yamlString += `  hosts: ${play.hosts}\n`;
    if (play.become !== undefined) {
      yamlString += `  become: ${play.become ? 'yes' : 'no'}\n`;
    }
    if (play.tasks.length > 0) {
      yamlString += `  tasks:\n`;
      play.tasks.forEach(task => {
        if (task.rawYAML) {
          const lines = task.rawYAML.trim().split('\n');
          // Ensure the first line of rawYAML starts with '- ' or is indented correctly under tasks.
          // Assuming rawYAML is a single task definition.
          lines.forEach((line, index) => {
            if (index === 0 && !line.trim().startsWith('-')) {
               yamlString += `    - ${line.trim()}\n`; // Start of a new task item
            } else if (index === 0 && line.trim().startsWith('-')) {
               yamlString += `    ${line.trim()}\n`; // Already a task item
            }
            else {
               yamlString += `      ${line.trim()}\n`; // Subsequent lines indented
            }
          });
        } else {
          yamlString += `    - name: "${task.name.replace(/"/g, '\\"')}"\n`; // Ensure task name is quoted
          if (task.comment) {
            yamlString += `      # ${task.comment}\n`;
          }
          yamlString += `      ${task.module}:\n`;
          Object.entries(task.parameters).forEach(([key, value]) => {
            let formattedValue = value;
            if (typeof value === 'string') {
              if (value.includes('\n')) {
                formattedValue = `|-\n          ${value.split('\n').join('\n          ')}`;
              } else if (value.includes(':') || value.includes('#') || value.includes('"') || value.includes("'") || ['yes', 'no', 'true', 'false', 'on', 'off', 'null'].includes(value.toLowerCase()) || /^\d/.test(value) || value.trim() === "") {
                 formattedValue = `"${value.replace(/"/g, '\\"')}"`;
              }
            } else if (typeof value === 'boolean') {
              formattedValue = value ? 'yes' : 'no';
            } else if (value === null || value === undefined) {
              formattedValue = 'null';
            }
            yamlString += `        ${key}: ${formattedValue}\n`;
          });
        }
        yamlString += "\n"; 
      });
    } else {
      yamlString += "  tasks: []\n\n";
    }
  });
  return yamlString.trim();
}


export function YamlDisplay({ tasks }: YamlDisplayProps) {
  const [yamlContent, setYamlContent] = React.useState("");

  React.useEffect(() => {
    setYamlContent(generatePlaybookYaml(tasks));
  }, [tasks]);

  return (
    <ScrollArea className="h-full w-full rounded-md border bg-card shadow-inner">
      <pre className="p-4 font-code text-xs whitespace-pre-wrap break-all" aria-label="Generated YAML playbook">
        {yamlContent || "# Add tasks to see YAML output here"}
      </pre>
    </ScrollArea>
  );
}
