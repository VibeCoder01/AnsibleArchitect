
"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface YamlSegment {
  id?: string; // Task ID if this segment represents a task
  content: string;
  isTaskBlock: boolean;
}

interface YamlDisplayProps {
  yamlSegments: YamlSegment[];
  hoveredTaskId: string | null;
  onSetHoveredSegmentId: (taskId: string | null) => void;
}

export function YamlDisplay({ yamlSegments, hoveredTaskId, onSetHoveredSegmentId }: YamlDisplayProps) {
  return (
    <ScrollArea className="h-full w-full">
      <pre className="p-4 font-code text-xs whitespace-pre-wrap break-all">
        {yamlSegments.length > 0 ? (
          yamlSegments.map((segment, index) => (
            <span
              key={segment.id || `segment-${index}`}
              className={cn({
                'bg-primary/10 rounded-sm': segment.isTaskBlock && segment.id === hoveredTaskId && hoveredTaskId !== null,
                'cursor-default': segment.isTaskBlock && segment.id, // Indicate hoverability for task blocks
              })}
              onMouseEnter={() => {
                if (segment.isTaskBlock && segment.id) {
                  onSetHoveredSegmentId(segment.id);
                }
              }}
              onMouseLeave={() => {
                if (segment.isTaskBlock && segment.id) {
                  onSetHoveredSegmentId(null);
                }
              }}
            >
              {segment.content}
            </span>
          ))
        ) : (
          "# Add tasks to see YAML output here"
        )}
      </pre>
    </ScrollArea>
  );
}
