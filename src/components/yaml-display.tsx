
"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface YamlDisplayProps {
  yamlContent: string;
}

export function YamlDisplay({ yamlContent }: YamlDisplayProps) {
  return (
    <ScrollArea className="h-full w-full">
      <pre className="p-4 font-code text-xs whitespace-pre-wrap break-all" aria-label="Generated YAML playbook">
        {yamlContent || "# Add tasks to see YAML output here"}
      </pre>
    </ScrollArea>
  );
}
