
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell, GitFork, CalendarClock } from "lucide-react";

export const defaultModules: AnsibleModuleDefinition[] = [
  { id: 'debug', module: 'debug', name: 'Debug Message', icon: TerminalSquare, description: 'Print statements during execution.', defaultParameters: { msg: "Hello world" } },
  { id: 'apt', module: 'apt', name: 'APT Package', icon: Package, description: 'Manages apt packages (Debian/Ubuntu).', defaultParameters: { name: "", state: "present" } },
  { id: 'service', module: 'service', name: 'Manage Service', icon: Cog, description: 'Manage services.', defaultParameters: { name: "", state: "started", enabled: "yes" } },
  { id: 'copy', module: 'copy', name: 'Copy File', icon: Copy, description: 'Copies files to remote nodes.', defaultParameters: { src: "", dest: "" } },
  { id: 'file', module: 'file', name: 'Manage File/Directory', icon: FileText, description: 'Sets attributes of files, symlinks or directories.', defaultParameters: { path: "", state: "touch" } },
  { id: 'template', module: 'template', name: 'Template File', icon: FileJson2, description: 'Templates a file out to a remote server.', defaultParameters: { src: "", dest: "" } },
  { id: 'user', module: 'user', name: 'User Management', icon: UserCog, description: 'Manage user accounts.', defaultParameters: { name: "", state: "present" } },
  { id: 'package_facts', module: 'package_facts', name: 'Gather Package Facts', icon: ListTree, description: 'Gathers facts about installed packages.', defaultParameters: { manager: "auto" } },
  { id: 'command', module: 'command', name: 'Execute Command', icon: Shell, description: 'Executes a command on the remote node.', defaultParameters: { cmd: "" } },
  { id: 'git', module: 'git', name: 'Git Repository', icon: GitFork, description: 'Deploy software from Git repositories.', defaultParameters: { repo: "", dest: "" } },
  { id: 'cron', module: 'cron', name: 'Cron Job', icon: CalendarClock, description: 'Manage cron jobs.', defaultParameters: { name: "", job: "", minute: "0", hour: "0" } },
];
