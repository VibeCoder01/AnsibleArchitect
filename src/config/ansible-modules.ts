
import type { AnsibleModuleGroup, AnsibleModuleDefinition } from "@/types/ansible";
import { 
  TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell, GitFork, CalendarClock, 
  DownloadCloud, ArchiveRestore, FileEdit, TextSelect, ShieldCheck, FilePlus, FolderOpen, FileSearch, 
  Replace, FileCog as FileCogIcon, FileSymlink, Archive as ArchiveIcon, PackagePlus, Box, Users2, Server, Power, 
  Network as NetworkIcon, ShieldAlert, Shield, FileCode, SlidersHorizontal, AlertCircle, CheckCircle2, Hourglass, Files, Search,
  Database, Puzzle, Cpu, HardDrive, Heater, KeyRound, Cloud, Info, ListChecks, Code
} from "lucide-react";

const fileModules: AnsibleModuleDefinition[] = [
  { id: 'file', module: 'file', name: 'Manage File/Directory', icon: FileText, description: 'Sets attributes of files, symlinks or directories.', defaultParameters: { path: "/path/to/file_or_dir", state: "touch" } },
  { id: 'copy', module: 'copy', name: 'Copy File/Directory', icon: Copy, description: 'Copies files/directories to remote nodes.', defaultParameters: { src: "/local/path/to/source", dest: "/remote/path/to/destination" } },
  { id: 'template', module: 'template', name: 'Template File', icon: FileJson2, description: 'Templates a file out to a remote server.', defaultParameters: { src: "template.j2", dest: "/remote/path/to/templated_file" } },
  { id: 'lineinfile', module: 'lineinfile', name: 'Manage Line in File', icon: FileEdit, description: 'Ensure a line is in a file, or replace based on regex.', defaultParameters: { path: "/path/to/file", line: "text to ensure", state: "present" } },
  { id: 'blockinfile', module: 'blockinfile', name: 'Manage Block in File', icon: TextSelect, description: 'Insert/update/remove a block of text in a file.', defaultParameters: { path: "/path/to/file", block: "# BEGIN ANSIBLE MANAGED BLOCK\n\n# END ANSIBLE MANAGED BLOCK", state: "present" } },
  { id: 'assemble', module: 'assemble', name: 'Assemble File', icon: Files, description: 'Assembles a configuration file from fragments.', defaultParameters: { src: "/path/to/fragments_dir/", dest: "/remote/path/to/assembled_file" } },
  { id: 'stat', module: 'stat', name: 'Get File Stats', icon: FileSearch, description: 'Retrieve file/path stats (exists, type, permissions).', defaultParameters: { path: "/path/to/file_or_dir" } },
  { id: 'find', module: 'find', name: 'Find Files', icon: Search, description: 'Find files based on criteria.', defaultParameters: { paths: "/path/to/search", patterns: "*.conf" } },
  { id: 'replace', module: 'replace', name: 'Replace String in File', icon: Replace, description: 'Replace all instances of a string in a file.', defaultParameters: { path: "/path/to/file", regexp: "old_string", replace: "new_string" } },
  { id: 'ini_file', module: 'ini_file', name: 'Manage INI File', icon: FileCogIcon, description: 'Tweak settings in INI files.', defaultParameters: { path: "/path/to/config.ini", section: "main", option: "key", value: "value" } },
  { id: 'xml', module: 'xml', name: 'Manage XML File', icon: FileCode, description: 'Manipulate XML files.', defaultParameters: { path: "/path/to/file.xml", xpath: "/root/element", value: "content" } },
];

const packageModules: AnsibleModuleDefinition[] = [
  { id: 'apt', module: 'apt', name: 'APT Package', icon: Package, description: 'Manages apt packages (Debian/Ubuntu).', defaultParameters: { name: "package_name", state: "present" } },
  { id: 'yum', module: 'yum', name: 'YUM Package', icon: Package, description: 'Manages packages with yum (RHEL/CentOS < 8).', defaultParameters: { name: "package_name", state: "present" } },
  { id: 'dnf', module: 'dnf', name: 'DNF Package', icon: Package, description: 'Manages packages with dnf (Fedora, RHEL/CentOS >= 8).', defaultParameters: { name: "package_name", state: "present" } },
  { id: 'pip', module: 'pip', name: 'PIP Package', icon: Box, description: 'Manages Python packages.', defaultParameters: { name: "python_package", state: "present" } },
  { id: 'gem', module: 'gem', name: 'GEM Package', icon: Box, description: 'Manages Ruby gems.', defaultParameters: { name: "ruby_gem", state: "present" } },
  { id: 'npm', module: 'npm', name: 'NPM Package', icon: Box, description: 'Manages Node.js packages.', defaultParameters: { name: "npm_package", path: "/path/to/project", state: "present" } },
  { id: 'homebrew', module: 'homebrew', name: 'Homebrew Package', icon: PackagePlus, description: 'Manages packages with Homebrew (macOS).', defaultParameters: { name: "brew_package", state: "present" } },
  { id: 'package_facts', module: 'package_facts', name: 'Gather Package Facts', icon: ListTree, description: 'Gathers facts about installed packages.', defaultParameters: { manager: "auto" } },
];

const systemServiceModules: AnsibleModuleDefinition[] = [
  { id: 'service', module: 'service', name: 'Manage Service', icon: Cog, description: 'Manage services (initd, systemd, etc.).', defaultParameters: { name: "service_name", state: "started", enabled: "yes" } },
  { id: 'systemd', module: 'systemd', name: 'Manage systemd Service', icon: Server, description: 'Control systemd units.', defaultParameters: { name: "service_name.service", state: "started", enabled: "yes", daemon_reload: "no" } },
  { id: 'user', module: 'user', name: 'User Management', icon: UserCog, description: 'Manage user accounts.', defaultParameters: { name: "username", state: "present" } },
  { id: 'group', module: 'group', name: 'Group Management', icon: Users2, description: 'Add or remove groups.', defaultParameters: { name: "groupname", state: "present" } },
  { id: 'hostname', module: 'hostname', name: 'Manage Hostname', icon: Cpu, description: 'Manage system hostname.', defaultParameters: { name: "new_hostname" } },
  { id: 'reboot', module: 'reboot', name: 'Reboot Machine', icon: Power, description: 'Reboot a machine, wait for it to come back.', defaultParameters: { reboot_timeout: 300 } },
  { id: 'mount', module: 'mount', name: 'Manage Mount Points', icon: HardDrive, description: 'Control active and configured mount points.', defaultParameters: { path: "/mnt/data", src: "/dev/sdb1", fstype: "ext4", state: "mounted" } },
  { id: 'selinux', module: 'selinux', name: 'Manage SELinux', icon: ShieldAlert, description: 'Manage SELinux state and policy.', defaultParameters: { policy: "targeted", state: "enforcing" } },
  { id: 'cron', module: 'cron', name: 'Cron Job', icon: CalendarClock, description: 'Manage cron jobs.', defaultParameters: { name: "job_name", job: "/usr/local/bin/script.sh", minute: "0", hour: "0" } },
];

const networkModules: AnsibleModuleDefinition[] = [
  { id: 'firewalld', module: 'firewalld', name: 'Firewalld Rule', icon: ShieldCheck, description: 'Manage firewall rules with firewalld.', defaultParameters: { port: "80/tcp", state: "enabled", permanent: "yes", immediate: "yes" } },
  { id: 'ufw', module: 'ufw', name: 'UFW Rule', icon: Shield, description: 'Manage UFW firewall (Uncomplicated Firewall).', defaultParameters: { rule: "allow", port: "22", proto: "tcp" } },
  { id: 'iptables', module: 'iptables', name: 'iptables Rule', icon: Heater, description: 'Manage iptables.', defaultParameters: { chain: "INPUT", protocol: "tcp", destination_port: "80", jump: "ACCEPT" } },
  { id: 'nmcli', module: 'nmcli', name: 'NetworkManager Config', icon: NetworkIcon, description: 'Manage networking with NetworkManager.', defaultParameters: { conn_name: "eth0_static", ifname: "eth0", type: "ethernet", ip4: "192.168.1.100/24", gw4: "192.168.1.1" } },
  { id: 'get_url', module: 'get_url', name: 'Download File (URL)', icon: DownloadCloud, description: 'Downloads files from HTTP, HTTPS, or FTP.', defaultParameters: { url: "https://example.com/file.zip", dest: "/tmp/file.zip" } },
];

const sourceControlModules: AnsibleModuleDefinition[] = [
  { id: 'git', module: 'git', name: 'Git Repository', icon: GitFork, description: 'Deploy software from Git repositories.', defaultParameters: { repo: "https://github.com/user/repo.git", dest: "/srv/myapp" } },
];

const utilityModules: AnsibleModuleDefinition[] = [
  { id: 'debug', module: 'debug', name: 'Debug Message', icon: TerminalSquare, description: 'Print statements during execution.', defaultParameters: { msg: "Hello world" } },
  { id: 'command', module: 'command', name: 'Execute Command', icon: Shell, description: 'Executes a command on the remote node (not through shell).', defaultParameters: { cmd: "ls -l /tmp" } },
  { id: 'shell', module: 'shell', name: 'Execute Shell Command', icon: TerminalSquare, description: 'Executes commands in a shell on the remote node.', defaultParameters: { cmd: "echo $HOME" } },
  { id: 'script', module: 'script', name: 'Run Local Script', icon: FileCode, description: 'Runs a local script on a remote node after transferring it.', defaultParameters: { cmd: "/path/to/local_script.sh arg1 arg2" } },
  { id: 'unarchive', module: 'unarchive', name: 'Unarchive File', icon: ArchiveRestore, description: 'Unpacks an archive (e.g., .zip, .tar.gz).', defaultParameters: { src: "/tmp/archive.zip", dest: "/opt/", remote_src: "no" } },
  { id: 'archive', module: 'archive', name: 'Create Archive', icon: ArchiveIcon, description: 'Creates a compressed archive of files.', defaultParameters: { path: "/srv/app_backup/*", dest: "/tmp/app_backup.tar.gz", format: "gz" } },
  { id: 'set_fact', module: 'set_fact', name: 'Set Fact', icon: SlidersHorizontal, description: 'Set new variables (facts) in the play.', defaultParameters: { my_custom_fact: "some_value" } },
  { id: 'fail', module: 'fail', name: 'Fail Play', icon: AlertCircle, description: 'Fail the play with a custom message.', defaultParameters: { msg: "A critical condition was not met." } },
  { id: 'assert', module: 'assert', name: 'Assert Condition', icon: CheckCircle2, description: 'Asserts given expressions are true.', defaultParameters: { that: "ansible_distribution == 'Ubuntu'", fail_msg: "This playbook is only for Ubuntu.", success_msg: "Distribution is Ubuntu." } },
  { id: 'wait_for', module: 'wait_for', name: 'Wait For Condition', icon: Hourglass, description: 'Waits for a condition before continuing.', defaultParameters: { host: "localhost", port: 8080, state: "started", delay: 5, timeout: 300 } },
  { id: 'uri', module: 'uri', name: 'Interact with Web Services', icon: Cloud, description: 'Interacts with HTTP and HTTPS web services.', defaultParameters: { url: "https://api.example.com/status", method: "GET", return_content: "yes"} },
  { id: 'slurp', module: 'slurp', name: 'Slurp File from Remote', icon: FilePlus, description: 'Slurps a file from remote nodes.', defaultParameters: { src: "/remote/path/to/file"} },
  { id: 'setup', module: 'setup', name: 'Gather Facts', icon: Info, description: 'Gathers facts about remote hosts.', defaultParameters: { filter: "ansible_*" } },
  { id: 'include_role', module: 'include_role', name: 'Include Role', icon: ListChecks, description: 'Load and execute a role.', defaultParameters: { name: "common_role" } },
  { id: 'add_host', module: 'add_host', name: 'Add Host to Inventory', icon: PackagePlus, description: 'Add a host (and alternatively a group) to the ansible-playbook in-memory inventory.', defaultParameters: { name: "new_host_alias", groups: "new_group", ansible_host: "192.168.10.50"} },
  { id: 'pause', module: 'pause', name: 'Pause Playbook', icon: Puzzle, description: 'Pauses playbook execution for a set amount of time or until a prompt is acknowledged.', defaultParameters: { minutes: 1, prompt: "Continue?" } },
];


export const moduleGroups: AnsibleModuleGroup[] = [
  { 
    name: "File Management", 
    icon: FolderOpen, 
    modules: fileModules 
  },
  { 
    name: "Package Management", 
    icon: Package, 
    modules: packageModules 
  },
  { 
    name: "System & Services", 
    icon: Server, 
    modules: systemServiceModules 
  },
  { 
    name: "Networking", 
    icon: NetworkIcon, 
    modules: networkModules 
  },
  { 
    name: "Source Control", 
    icon: GitFork, 
    modules: sourceControlModules 
  },
  { 
    name: "Utilities & Execution", 
    icon: Cog, 
    modules: utilityModules 
  },
];

