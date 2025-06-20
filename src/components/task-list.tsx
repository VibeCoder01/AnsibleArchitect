
"use client";

import * as React from "react";
import type { AnsibleTask, AnsibleRoleRef } from "@/types/ansible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2, Edit3, GripVertical, TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell,
  GitFork, CalendarClock, DownloadCloud, ArchiveRestore, FileEdit, TextSelect, ShieldCheck, PlusCircle, X,
  FilePlus, FolderOpen, FileSearch, Replace, FileCog as FileCogIcon, FileSymlink, Archive as ArchiveIcon, PackagePlus, Box,
  Users2, Server, Power, Network as NetworkIcon, ShieldAlert, Shield, FileCode, SlidersHorizontal, AlertCircle,
  CheckCircle2, Hourglass, Files, Search as SearchIconLucide,
  Database, Puzzle, Cpu, HardDrive, Heater, KeyRound, Cloud, Info, ListChecks, CodeXml, ExternalLink, CloudCog, DatabaseZap,
  TestTube2, MessageSquare, Eye, Waypoints, CloudDownload, CloudUpload, Container, Workflow, Building, Globe, Lock, KeySquare, Layers, Route, Users, ServerCog, Wand2,
  Shuffle, AlignCenter, Braces, SquareCode, Settings2, ToggleLeft, Lightbulb, RefreshCw, Save, FileBadge, BarChartBig, Shapes,
  FileLock2, Layers3, Camera, Tags, Laptop
} from "lucide-react";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';


interface TaskListProps {
  tasks: AnsibleTask[];
  onUpdateTask: (updatedTask: AnsibleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (dragIndex: number, hoverIndex: number) => void;
  definedRoles?: AnsibleRoleRef[];
  hoveredTaskId: string | null;
  onSetHoveredTaskId: (taskId: string | null) => void;
}

const moduleIcons: Record<string, React.ElementType> = {
  // File Management
  'ansible.builtin.file': FileText,
  'ansible.builtin.copy': Copy,
  'ansible.builtin.template': FileJson2,
  'ansible.builtin.lineinfile': FileEdit,
  'ansible.builtin.blockinfile': TextSelect,
  'ansible.builtin.assemble': Files,
  'ansible.builtin.stat': FileSearch,
  'ansible.builtin.find': SearchIconLucide,
  'ansible.builtin.replace': Replace,
  'community.general.ini_file': FileCogIcon,
  'community.general.xml': FileCode,
  'ansible.posix.acl': Lock,
  'ansible.builtin.tempfile': FilePlus,
  'community.general.iso_extract': Container,
  'ansible.builtin.patch': Wand2,
  'ansible.posix.synchronize': RefreshCw,
  // Package Management
  'ansible.builtin.package': Package,
  'ansible.builtin.apt': Package,
  'ansible.builtin.yum': Package,
  'ansible.builtin.dnf': Package,
  'ansible.builtin.zypper': Package,
  'community.general.pacman': Package,
  'ansible.builtin.pip': Box,
  'community.general.gem': Box,
  'community.general.npm': Box,
  'community.general.homebrew': PackagePlus,
  'community.general.snap': Container,
  'community.general.flatpak': Container,
  'ansible.builtin.package_facts': ListTree,
  'ansible.builtin.apt_key': KeySquare,
  'ansible.builtin.apt_repository': Layers,
  // System & Services
  'ansible.builtin.service': Cog,
  'ansible.builtin.systemd': Server,
  'ansible.builtin.user': UserCog,
  'ansible.builtin.group': Users2,
  'ansible.builtin.hostname': Cpu,
  'ansible.builtin.reboot': Power,
  'ansible.builtin.shutdown': Power,
  'ansible.posix.mount': HardDrive,
  'ansible.posix.selinux': ShieldAlert,
  'ansible.posix.sysctl': Settings2,
  'ansible.builtin.cron': CalendarClock,
  'community.general.at': CalendarClock,
  'community.general.alternatives': Shuffle,
  'ansible.posix.authorized_key': KeySquare,
  'ansible.builtin.known_hosts': ServerCog,
  'community.general.modprobe': Puzzle,
  'ansible.builtin.service_facts': ListTree,
  'community.general.capabilities': ShieldCheck,
  'community.general.pam_limits': Users,
  'ansible.posix.syslog_facility': FileText,
  'community.general.locale_gen': Globe,
  'community.general.timezone': CalendarClock,
  // Networking
  'ansible.posix.firewalld': ShieldCheck,
  'community.general.ufw': Shield,
  'ansible.builtin.iptables': Heater,
  'community.general.nmcli': NetworkIcon,
  'ansible.builtin.get_url': DownloadCloud,
  'ansible.builtin.uri': Cloud,
  'community.general.nftables': Shield,
  'ansible.builtin.hostname_facts': Info,
  'community.general.interfaces_file': AlignCenter,
  'community.general.netplan': Route,
  'ansible.builtin.listen_ports_facts': Eye,
  'community.general.iptables_state': Save,
  // Source Control
  'ansible.builtin.git': GitFork,
  'community.general.subversion': Workflow,
  'community.general.hg': Shuffle,
  // Cloud Management
  'amazon.aws.s3_bucket': CloudCog,
  'amazon.aws.ec2_instance': Server,
  'amazon.aws.rds_instance': Database,
  'amazon.aws.ec2_vpc_net': NetworkIcon,
  'amazon.aws.iam_role': Users,
  'amazon.aws.ec2_security_group': Shield,
  'google.cloud.gcp_compute_instance': Server,
  'google.cloud.gcp_sql_instance': Database,
  'azure.azcollection.azure_rm_virtualmachine': Server,
  'azure.azcollection.azure_rm_storageaccount': CloudUpload,
  'community.docker.docker_image': Container,
  'community.docker.docker_container': Container,
  'community.docker.docker_network': NetworkIcon,
  'community.docker.docker_volume': HardDrive,
  'community.docker.docker_compose': Layers,
  // Database Management
  'community.mysql.mysql_db': DatabaseZap,
  'community.mysql.mysql_user': UserCog,
  'community.postgresql.postgresql_db': DatabaseZap,
  'community.postgresql.postgresql_user': UserCog,
  'community.mongodb.mongodb_user': UserCog,
  'community.general.redis_config': Settings2,
  'community.mysql.mysql_replication': GitFork,
  'community.postgresql.postgresql_privs': Lock,
  // Utilities & Execution
  'ansible.builtin.debug': TerminalSquare,
  'ansible.builtin.command': Shell,
  'ansible.builtin.shell': TerminalSquare,
  'ansible.builtin.script': FileCode,
  'ansible.builtin.raw': Lightbulb,
  'ansible.builtin.unarchive': ArchiveRestore,
  'community.general.archive': ArchiveIcon,
  'ansible.builtin.set_fact': SlidersHorizontal,
  'ansible.builtin.fail': AlertCircle,
  'ansible.builtin.assert': CheckCircle2,
  'ansible.builtin.wait_for': Hourglass,
  'ansible.builtin.slurp': FilePlus,
  'ansible.builtin.setup': Info,
  'ansible.builtin.include_role': ListChecks,
  'ansible.builtin.import_role': ListChecks,
  'ansible.builtin.include_tasks': Braces,
  'ansible.builtin.import_tasks': Braces,
  'ansible.builtin.add_host': PackagePlus,
  'ansible.builtin.group_by': Layers,
  'ansible.builtin.pause': Hourglass,
  'ansible.builtin.meta': Workflow,
  'ansible.builtin.ping': TestTube2,
  'ansible.builtin.gather_facts': Info,
  'delegate_to': Waypoints,
  'run_once': MessageSquare,
  'tags': ToggleLeft,
  'community.crypto.openssl_privatekey': KeyRound,
  'community.crypto.x509_certificate': FileBadge,
  'ansible.builtin.include_vars': FileSymlink,
  'ansible.builtin.set_stats': BarChartBig,
  'community.general.wakeonlan': Power,
  // HashiCorp Modules
  'community.hashi_vault.vault_kv2_get': KeyRound,
  'community.hashi_vault.vault_write': FileLock2,
  'community.general.consul_kv': Database,
  'community.general.consul_service': ServerCog,
  'community.general.terraform': Layers3,
  'community.general.nomad_job': Container,
  // Proxmox VE Modules
  'community.general.proxmox_kvm': Server,
  'community.general.proxmox_lxc': Container,
  'community.general.proxmox_pool_member': Layers,
  'community.general.proxmox_template': Copy,
  // VMware Modules
  'community.vmware.vmware_guest': Server,
  'community.vmware.vmware_guest_info': Info,
  'community.vmware.vmware_guest_snapshot': Camera,
  'community.vmware.vmware_datacenter': Building,
  'community.vmware.vmware_folder': FolderOpen,
  'community.vmware.vmware_tag_manager': Tags,
  // Microsoft / Windows Modules
  'community.windows.win_feature': ListChecks,
  'community.windows.win_package': Package,
  'community.windows.win_service': Cog,
  'community.windows.win_user': UserCog,
  'community.windows.win_reboot': Power,
  'community.windows.win_domain_membership': Users,
  'community.sqlserver.sqlserver_db': Database,
  // Default/Fallback
  default: Puzzle,
};

interface EditableParameter {
  id: string;
  key: string;
  value: string;
}

const MANUAL_ENTRY_VALUE = "_INTERNAL_MANUAL_ROLE_SELECTION_";

const compareParameters = (params1: Record<string, any>, params2: Record<string, any>): boolean => {
  const keys1 = Object.keys(params1);
  const keys2 = Object.keys(params2);

  if (keys1.length !== keys2.length) {
    return false; 
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || params1[key] !== params2[key]) {
      return false; 
    }
  }
  return true; 
};

export function TaskList({ tasks, onUpdateTask, onDeleteTask, onMoveTask, definedRoles = [], hoveredTaskId, onSetHoveredTaskId }: TaskListProps) {
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
        id: uuidv4(),
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

  const handleSelectDefinedRole = (roleName: string) => {
    const nameParamIndex = editableParameters.findIndex(p => p.key === 'name');
    if (nameParamIndex > -1) {
      setEditableParameters(prev =>
        prev.map((p, index) => (index === nameParamIndex ? { ...p, value: roleName } : p))
      );
    } else {
      setEditableParameters(prev => [
        ...prev,
        { id: uuidv4(), key: 'name', value: roleName },
      ]);
    }
  };

  const handleAddParameter = () => {
    setEditableParameters(prev => [
      ...prev,
      { id: uuidv4(), key: '', value: '' },
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
          let val: any = p.value;
          const lowerVal = p.value.toLowerCase().trim();
          if (lowerVal === 'true' || lowerVal === 'yes') val = true;
          else if (lowerVal === 'false' || lowerVal === 'no') val = false;
          else if (trimmedKey !== 'name' && !isNaN(Number(p.value)) && p.value.trim() !== "") val = Number(p.value);
          acc[trimmedKey] = val;
        }
        return acc;
      }, {} as Record<string, any>);
      
      let finalPristineStatus = editingTask.isPristine ?? false;

      if (editingTask.isPristine) { 
        const oldParams = editingTask.parameters || {};
        const paramsHaveChanged = !compareParameters(oldParams, newParams);
        if (paramsHaveChanged) {
          finalPristineStatus = false;
        }
      }

      onUpdateTask({ 
        ...editingTask, 
        name: tempTaskName, 
        parameters: newParams, 
        isPristine: finalPristineStatus 
      });
      setEditingTask(null);
    }
  };

  const isRoleModuleType = editingTask?.module === 'ansible.builtin.include_role' || editingTask?.module === 'ansible.builtin.import_role';

  const currentRoleNameParamValue = editableParameters.find(p => p.key === 'name')?.value || "";

  const selectDisplayValue = (isRoleModuleType && definedRoles.some(r => r.name === currentRoleNameParamValue))
                             ? currentRoleNameParamValue
                             : (isRoleModuleType && currentRoleNameParamValue === "" ? MANUAL_ENTRY_VALUE : "");


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
            const IconComponent = moduleIcons[task.module] || moduleIcons.default;
            return (
              <Card
                key={task.id}
                className={cn(
                  "shadow-sm hover:shadow-md transition-all group relative",
                  task.isPristine ? "bg-primary/5 border-destructive" : "bg-card",
                  { 'ring-1 ring-primary/50': task.id === hoveredTaskId && hoveredTaskId !== null }
                )}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onMouseEnter={() => onSetHoveredTaskId(task.id)}
                onMouseLeave={() => onSetHoveredTaskId(null)}
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

              {isRoleModuleType && definedRoles.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="definedRoleSelect" className="font-medium">Select Defined Role</Label>
                    <Select
                      value={selectDisplayValue || MANUAL_ENTRY_VALUE}
                      onValueChange={(selectedValue) => {
                        if (selectedValue === MANUAL_ENTRY_VALUE) {
                          const nameParamIndex = editableParameters.findIndex(p => p.key === 'name');
                          if (nameParamIndex > -1) {
                            setEditableParameters(prev =>
                              prev.map((p, index) => (index === nameParamIndex ? { ...p, value: "" } : p))
                            );
                          } else {
                             setEditableParameters(prev => [
                              ...prev,
                              { id: uuidv4(), key: 'name', value: '' },
                            ]);
                          }
                        } else {
                          handleSelectDefinedRole(selectedValue);
                        }
                      }}
                    >
                      <SelectTrigger id="definedRoleSelect" className="mt-1 text-sm">
                        <SelectValue placeholder="Select a defined role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MANUAL_ENTRY_VALUE}>-- Manual Entry / None --</SelectItem>
                        {definedRoles.map(role => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Selecting a role will populate the 'name' parameter below. Choose 'Manual Entry' to type freely.</p>
                  </div>
                </>
              )}

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
                        disabled={isRoleModuleType && param.key === 'name' && definedRoles.some(r => r.name === param.value) && param.value !== "" && param.value !== MANUAL_ENTRY_VALUE}
                      />
                      <Input
                        aria-label="Parameter value"
                        placeholder="Value (string, number, true/false, yes/no)"
                        value={param.value}
                        onChange={(e) => handleParameterPropertyChange(param.id, 'value', e.target.value)}
                        className="flex-1 text-sm"
                        disabled={isRoleModuleType && param.key === 'name' && definedRoles.some(r => r.name === param.value) && param.value !== "" && param.value !== MANUAL_ENTRY_VALUE}
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

