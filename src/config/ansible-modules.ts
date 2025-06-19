
import type { AnsibleModuleDefinition } from "@/types/ansible";
import { TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell, GitFork, CalendarClock, DownloadCloud, ArchiveRestore, FileEdit, TextSelect, ShieldCheck } from "lucide-react";

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
  { id: 'get_url', module: 'get_url', name: 'Download File (URL)', icon: DownloadCloud, description: 'Downloads files from HTTP, HTTPS, or FTP.', defaultParameters: { url: "", dest: "" } },
  { id: 'unarchive', module: 'unarchive', name: 'Unarchive File', icon: ArchiveRestore, description: 'Unpacks an archive (e.g., .zip, .tar.gz).', defaultParameters: { src: "", dest: "", remote_src: "no" } },
  { id: 'lineinfile', module: 'lineinfile', name: 'Manage Line in File', icon: FileEdit, description: 'Ensure a line is in a file, or replace based on regex.', defaultParameters: { path: "", line: "", state: "present" } },
  { id: 'blockinfile', module: 'blockinfile', name: 'Manage Block in File', icon: TextSelect, description: 'Insert/update/remove a block of text in a file.', defaultParameters: { path: "", block: "# BEGIN ANSIBLE MANAGED BLOCK\n\n# END ANSIBLE MANAGED BLOCK", state: "present" } },
  { id: 'firewalld', module: 'firewalld', name: 'Firewalld Rule', icon: ShieldCheck, description: 'Manage firewall rules with firewalld.', defaultParameters: { port: "80/tcp", state: "enabled", permanent: "yes", immediate: "yes" } },
];
