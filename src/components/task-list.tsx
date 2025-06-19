
"use client";

import * as React from "react";
import type { AnsibleTask } from "@/types/ansible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, Edit3, GripVertical, TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell, 
  GitFork, CalendarClock, DownloadCloud, ArchiveRestore, FileEdit, TextSelect, ShieldCheck, PlusCircle, X,
  FilePlus, FolderOpen, FileSearch, Replace, FileCog as FileCogIcon, FileSymlink, Archive as ArchiveIcon, PackagePlus, Box, 
  Users2, Server, Power, Network as NetworkIcon, ShieldAlert, Shield, FileCode, SlidersHorizontal, AlertCircle, 
  CheckCircle2, Hourglass, Files, Search as SearchIconLucide, // Renamed to avoid conflict with component
  Database, Puzzle, Cpu, HardDrive, Heater, KeyRound, Cloud, Info, ListChecks, CodeXml, ExternalLink, CloudCog, DatabaseZap,
  TestTube2, MessageSquare, Eye, Waypoints, CloudDownload, CloudUpload, Container, Workflow, Building, Globe, Lock, KeySquare, Layers, Route, Users, ServerCog, Wand2,
  Shuffle, AlignCenter, Braces, SquareCode, Settings2, ToggleLeft, Lightbulb
} from "lucide-react";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";


interface TaskListProps {
  tasks: AnsibleTask[];
  onUpdateTask: (updatedTask: AnsibleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (dragIndex: number, hoverIndex: number) => void;
}

const moduleIcons: Record<string, React.ElementType> = {
  // File Management
  file: FileText,
  copy: Copy,
  template: FileJson2,
  lineinfile: FileEdit,
  blockinfile: TextSelect,
  assemble: Files,
  stat: FileSearch,
  find: SearchIconLucide,
  replace: Replace,
  ini_file: FileCogIcon,
  xml: CodeXml,
  acl: Lock,
  tempfile: FilePlus,
  iso_extract: Container,
  patch: Wand2,
  // Package Management
  package: Package,
  apt: Package,
  yum: Package,
  dnf: Package,
  zypper: Package,
  pacman: Package,
  pip: Box,
  gem: Box,
  npm: Box,
  homebrew: PackagePlus,
  snap: Container,
  flatpak: Container,
  package_facts: ListTree,
  apt_key: KeySquare,
  apt_repository: Layers,
  // System & Services
  service: Cog,
  systemd: Server,
  user: UserCog,
  group: Users2,
  hostname: Cpu,
  reboot: Power,
  shutdown: Power,
  mount: HardDrive,
  selinux: ShieldAlert,
  sysctl: Settings2,
  cron: CalendarClock,
  at: CalendarClock,
  alternatives: Shuffle,
  authorized_key: KeySquare,
  known_hosts: ServerCog,
  modprobe: Puzzle,
  service_facts: ListTree,
  capabilities: ShieldCheck,
  pam_limits: Users,
  // Networking
  firewalld: ShieldCheck,
  ufw: Shield,
  iptables: Heater,
  nmcli: NetworkIcon,
  get_url: DownloadCloud,
  uri: Cloud,
  nftables: Shield,
  hostname_facts: Info,
  interfaces_file: AlignCenter,
  netplan: Route,
  listen_ports_facts: Eye,
  // Source Control
  git: GitFork,
  subversion: Workflow,
  hg: Shuffle,
  // Cloud Management
  s3_bucket: CloudCog, // Generic, can be amazon.aws.s3_bucket
  ec2_instance: Server, // Generic, can be amazon.aws.ec2_instance
  rds_instance: Database, // Generic, can be amazon.aws.rds_instance
  gcp_compute_instance: Server,
  gcp_sql_instance: Database,
  azure_rm_virtualmachine: Server,
  azure_rm_storageaccount: CloudUpload,
  docker_image: Container,
  docker_container: Container,
  docker_network: NetworkIcon,
  docker_volume: HardDrive,
  // Database Management
  mysql_db: DatabaseZap,
  mysql_user: UserCog,
  postgresql_db: DatabaseZap,
  postgresql_user: UserCog,
  mongodb_user: UserCog,
  redis_config: Settings2,
  // Utilities & Execution
  debug: TerminalSquare,
  command: Shell,
  shell: TerminalSquare, // Already had Shell, using TerminalSquare for consistency
  script: FileCode,
  raw: Lightbulb,
  unarchive: ArchiveRestore,
  archive: ArchiveIcon,
  set_fact: SlidersHorizontal,
  fail: AlertCircle,
  assert: CheckCircle2,
  wait_for: Hourglass,
  slurp: FilePlus,
  setup: Info,
  include_role: ListChecks,
  import_role: ListChecks,
  include_tasks: Braces,
  import_tasks: Braces,
  add_host: PackagePlus,
  group_by: Layers,
  pause: Hourglass,
  meta: Workflow,
  ping: TestTube2,
  gather_facts: Info,
  delegate_to: Waypoints,
  run_once: MessageSquare,
  tags: ToggleLeft,
  // Default/Fallback
  default: Puzzle, 
};

interface EditableParameter {
  id: string;
  key: string;
  value: string;
}

export function TaskList({ tasks, onUpdateTask, onDeleteTask, onMoveTask }: TaskListProps) {
  const [editingTask, setEditingTask] = React.useState<AnsibleTask | null>(null);
  const [tempTaskName, setTempTaskName] = React.useState<string>("");
  const [editableParameters, setEditableParameters] = React.useState<EditableParameter[]>([]);

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onMoveTask(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  const openEditModal = (task: AnsibleTask) => {
    setEditingTask(task);
    setTempTaskName(task.name);
    setEditableParameters(
      Object.entries(task.parameters || {}).map(([k, v]) => ({
        id: crypto.randomUUID(),
        key: k,
        value: String(v ?? ''), 
      }))
    );
  };

  const handleParameterPropertyChange = (id: string, field: 'key' | 'value', newValue: string) => {
    setEditableParameters(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: newValue } : p))
    );
  };

  const handleAddParameter = () => {
    setEditableParameters(prev => [
      ...prev,
      { id: crypto.randomUUID(), key: '', value: '' },
    ]);
  };

  const handleRemoveParameter = (id: string) => {
    setEditableParameters(prev => prev.filter(p => p.id !== id));
  };
  
  const handleSaveTask = () => {
    if (editingTask) {
      const newParams = editableParameters.reduce((acc, p) => {
        const trimmedKey = p.key.trim();
        if (trimmedKey) {
          // Attempt to convert "true", "false", "yes", "no" to boolean, and numbers to numbers
          if (trimmedKey.toLowerCase() === 'true' || trimmedKey.toLowerCase() === 'yes') acc[trimmedKey] = true;
          else if (trimmedKey.toLowerCase() === 'false' || trimmedKey.toLowerCase() === 'no') acc[trimmedKey] = false;
          else if (!isNaN(Number(p.value)) && p.value.trim() !== "") acc[trimmedKey] = Number(p.value);
          else acc[trimmedKey] = p.value; 
        }
        return acc;
      }, {} as Record<string, any>);
      onUpdateTask({ ...editingTask, name: tempTaskName, parameters: newParams });
      setEditingTask(null);
    }
  };

  return (
    <ScrollArea className="h-full p-0.5 flex-grow">
      {tasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground flex-grow flex flex-col items-center justify-center h-full">
          <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p className="font-medium text-sm">Your playbook is empty.</p>
          <p className="text-xs">Drag modules here to add tasks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, index) => {
            // Try to match full module name first (e.g., community.docker.docker_image), then fallback to base name (e.g., docker_image)
            const IconComponent = moduleIcons[task.module] || moduleIcons[task.module.split('.').pop() || 'default'] || moduleIcons.default;
            return (
              <Card 
                key={task.id} 
                className="bg-card shadow-sm hover:shadow-md transition-shadow group relative"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="flex items-center p-3">
                  <Button variant="ghost" size="icon" className="cursor-grab p-1 mr-2 h-auto touch-none" aria-label="Drag to reorder task">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <IconComponent className="w-5 h-5 text-primary flex-shrink-0 mr-2" />
                  <div className="flex-grow min-w-0">
                    <CardTitle className="text-sm font-medium text-card-foreground leading-tight truncate" title={task.name}>{task.name}</CardTitle>
                    <CardDescription className="text-xs truncate" title={`Module: ${task.module}`}>Module: {task.module}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!task.rawYAML && (
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditModal(task)} aria-label="Edit task">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onDeleteTask(task.id)} aria-label="Delete task">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                {task.rawYAML ? (
                   <CardContent className="px-3 pb-2 pt-0">
                      <pre className="font-code bg-muted/20 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                          {task.rawYAML}
                      </pre>
                   </CardContent>
                ) : (Object.keys(task.parameters || {}).length > 0 || task.comment) && (
                  <CardContent className="px-3 pb-2 pt-0 text-xs">
                    {task.comment && <p className="italic text-muted-foreground mb-1"># {task.comment}</p>}
                    {Object.keys(task.parameters || {}).length > 0 && (
                      <details className="max-h-32 overflow-y-auto">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">Parameters</summary>
                        <ul className="text-xs space-y-0.5 mt-1 pl-2 border-l ml-1">
                          {Object.entries(task.parameters || {}).map(([key, value]) => (
                            <li key={key} className="truncate"><span className="font-medium">{key}:</span> {String(value)}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-headline">Edit Task: {editingTask.module}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto px-1">
              <div>
                <Label htmlFor="taskNameEdit" className="font-medium">Task Name</Label>
                <Input 
                  id="taskNameEdit" 
                  value={tempTaskName} 
                  onChange={(e) => setTempTaskName(e.target.value)} 
                  className="mt-1 text-sm"
                />
              </div>
              <Separator />
              <div>
                <Label className="font-medium block mb-1">Parameters</Label>
                <div className="space-y-2">
                  {editableParameters.map((param) => (
                    <div key={param.id} className="flex items-center space-x-2">
                      <Input
                        aria-label="Parameter key"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => handleParameterPropertyChange(param.id, 'key', e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Input
                        aria-label="Parameter value"
                        placeholder="Value (string, number, true/false, yes/no)"
                        value={param.value}
                        onChange={(e) => handleParameterPropertyChange(param.id, 'value', e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleRemoveParameter(param.id)} aria-label="Remove parameter">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={handleAddParameter} className="mt-3 text-xs px-2 py-1">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Add Parameter
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveTask}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ScrollArea>
  );
}
