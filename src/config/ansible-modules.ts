
import type { AnsibleModuleGroup, AnsibleModuleDefinition } from "@/types/ansible";
import { 
  TerminalSquare, Package, Cog, Copy, FileText, FileJson2, UserCog, ListTree, Shell, GitFork, CalendarClock, 
  DownloadCloud, ArchiveRestore, FileEdit, TextSelect, ShieldCheck, FilePlus, FolderOpen, FileSearch, 
  Replace, FileCog as FileCogIcon, FileSymlink, Archive as ArchiveIcon, PackagePlus, Box, Users2, Server, Power, 
  Network as NetworkIcon, ShieldAlert, Shield, FileCode, SlidersHorizontal, AlertCircle, CheckCircle2, Hourglass, Files, Search,
  Database, Puzzle, Cpu, HardDrive, Heater, KeyRound, Cloud, Info, ListChecks, CodeXml, ExternalLink, CloudCog, DatabaseZap, TestTube2, MessageSquare, Eye,
  Waypoints, CloudDownload, CloudUpload, Container, Workflow, Building, Globe, Lock, KeySquare, Layers, Route, Users, ServerCog, Wand2,
  Shuffle, AlignCenter, Braces, SquareCode, Settings2, ToggleLeft, Lightbulb, RefreshCw, Save, FileBadge, BarChartBig,
  Shapes, FileLock2, Layers3, Camera, Tags, Laptop
} from "lucide-react";

const fileManagementModules: AnsibleModuleDefinition[] = [
  { id: 'file', module: 'ansible.builtin.file', name: 'Manage File/Directory', icon: FileText, description: 'Sets attributes of files, symlinks or directories, or creates/deletes them.', defaultParameters: { path: "/path/to/file_or_dir", state: "touch" } },
  { id: 'copy', module: 'ansible.builtin.copy', name: 'Copy File/Directory', icon: Copy, description: 'Copies files/directories from local/remote to remote nodes.', defaultParameters: { src: "/local/path/to/source", dest: "/remote/path/to/destination" } },
  { id: 'template', module: 'ansible.builtin.template', name: 'Template File', icon: FileJson2, description: 'Templates a file out to a remote server using Jinja2.', defaultParameters: { src: "template.j2", dest: "/remote/path/to/templated_file" } },
  { id: 'lineinfile', module: 'ansible.builtin.lineinfile', name: 'Manage Line in File', icon: FileEdit, description: 'Ensure a line is in a file, or replace/remove based on regex.', defaultParameters: { path: "/path/to/file", line: "text_to_ensure = value", state: "present" } },
  { id: 'blockinfile', module: 'ansible.builtin.blockinfile', name: 'Manage Block in File', icon: TextSelect, description: 'Insert/update/remove a block of multi-line text in a file.', defaultParameters: { path: "/path/to/file", block: "# BEGIN ANSIBLE MANAGED BLOCK\\nconfig_option=true\\n# END ANSIBLE MANAGED BLOCK", state: "present" } },
  { id: 'assemble', module: 'ansible.builtin.assemble', name: 'Assemble File from Fragments', icon: Files, description: 'Assembles a configuration file from multiple fragment files.', defaultParameters: { src: "/path/to/fragments_dir/", dest: "/remote/path/to/assembled_file" } },
  { id: 'stat', module: 'ansible.builtin.stat', name: 'Get File/Path Stats', icon: FileSearch, description: 'Retrieve file/path stats (exists, type, permissions, checksum).', defaultParameters: { path: "/path/to/file_or_dir" } },
  { id: 'find', module: 'ansible.builtin.find', name: 'Find Files/Directories', icon: Search, description: 'Find files or directories based on various criteria.', defaultParameters: { paths: "/path/to/search", patterns: "*.log", age: "7d", age_stamp: "mtime" } },
  { id: 'replace', module: 'ansible.builtin.replace', name: 'Replace String in File', icon: Replace, description: 'Replace all instances of a matched string or regex in a file.', defaultParameters: { path: "/path/to/file", regexp: "old_string_pattern", replace: "new_string" } },
  { id: 'ini_file', module: 'community.general.ini_file', name: 'Manage INI File Entries', icon: FileCogIcon, description: 'Manage settings in INI-style configuration files.', defaultParameters: { path: "/path/to/config.ini", section: "main_settings", option: "key_name", value: "new_value", state: "present" } },
  { id: 'xml', module: 'community.general.xml', name: 'Manage XML File Content', icon: FileCode, description: 'Manipulate XML files (add, remove, modify elements/attributes).', defaultParameters: { path: "/path/to/file.xml", xpath: "/root/element[@name='target']", attribute: "value", value: "new_content" } },
  { id: 'acl', module: 'ansible.posix.acl', name: 'Manage File ACLs', icon: Lock, description: 'Set and retrieve file ACLs.', defaultParameters: { path: "/path/to/resource", entity: "user1", etype: "user", permissions: "rw", state: "present" } },
  { id: 'tempfile', module: 'ansible.builtin.tempfile', name: 'Create Temporary File/Directory', icon: FilePlus, description: 'Creates temporary files and directories.', defaultParameters: { state: "file", suffix: "myapp" } },
  { id: 'iso_extract', module: 'community.general.iso_extract', name: 'Extract ISO File', icon: Container, description: 'Extracts an ISO file to a directory.', defaultParameters: { image: "/path/to/image.iso", dest: "/mnt/iso_contents" } },
  { id: 'patch', module: 'ansible.builtin.patch', name: 'Apply Patch File', icon: Wand2, description: 'Apply a patch to a file or directory tree.', defaultParameters: { src: "/path/to/patch.diff", dest: "/path/to/source_tree" } },
  { id: 'synchronize', module: 'ansible.posix.synchronize', name: 'Synchronize Files (rsync)', icon: RefreshCw, description: 'Efficiently synchronize files/directories using rsync.', defaultParameters: { mode: "push", src: "/local/path/", dest: "/remote/path/" } },
];

const packageManagementModules: AnsibleModuleDefinition[] = [
  { id: 'package', module: 'ansible.builtin.package', name: 'Generic Package Manager', icon: Package, description: 'Manages packages using the auto-detected system package manager.', defaultParameters: { name: "package_name", state: "present" } },
  { id: 'apt', module: 'ansible.builtin.apt', name: 'APT Package (Debian/Ubuntu)', icon: Package, description: 'Manages apt packages.', defaultParameters: { name: "nginx", state: "present", update_cache: "yes" } },
  { id: 'yum', module: 'ansible.builtin.yum', name: 'YUM Package (RHEL/CentOS <8)', icon: Package, description: 'Manages packages with yum.', defaultParameters: { name: "httpd", state: "present" } },
  { id: 'dnf', module: 'ansible.builtin.dnf', name: 'DNF Package (Fedora, RHEL >=8)', icon: Package, description: 'Manages packages with dnf.', defaultParameters: { name: "podman", state: "present" } },
  { id: 'zypper', module: 'ansible.builtin.zypper', name: 'Zypper Package (openSUSE/SLES)', icon: Package, description: 'Manages packages with zypper.', defaultParameters: { name: "apache2", state: "present" } },
  { id: 'pacman', module: 'community.general.pacman', name: 'Pacman Package (Arch Linux)', icon: Package, description: 'Manages packages with pacman.', defaultParameters: { name: "docker", state: "present" } },
  { id: 'pip', module: 'ansible.builtin.pip', name: 'PIP Package (Python)', icon: Box, description: 'Manages Python packages.', defaultParameters: { name: "requests", version: "2.25.1", state: "present" } },
  { id: 'gem', module: 'community.general.gem', name: 'GEM Package (Ruby)', icon: Box, description: 'Manages Ruby gems.', defaultParameters: { name: "rails", state: "present" } },
  { id: 'npm', module: 'community.general.npm', name: 'NPM Package (Node.js)', icon: Box, description: 'Manages Node.js packages.', defaultParameters: { name: "express", path: "/path/to/project", state: "present" } },
  { id: 'homebrew', module: 'community.general.homebrew', name: 'Homebrew Package (macOS)', icon: PackagePlus, description: 'Manages packages with Homebrew.', defaultParameters: { name: "htop", state: "present" } },
  { id: 'snap', module: 'community.general.snap', name: 'Snap Package', icon: Container, description: 'Manages snap packages.', defaultParameters: { name: "code", classic: "yes", state: "present" } },
  { id: 'flatpak', module: 'community.general.flatpak', name: 'Flatpak Package', icon: Container, description: 'Manages Flatpak applications.', defaultParameters: { name: "org.gimp.GIMP", state: "present" } },
  { id: 'package_facts', module: 'ansible.builtin.package_facts', name: 'Gather Package Facts', icon: ListTree, description: 'Gathers facts about installed packages.', defaultParameters: { manager: "auto" } },
  { id: 'apt_key', module: 'ansible.builtin.apt_key', name: 'Manage APT Keys', icon: KeySquare, description: 'Add or remove APT keys.', defaultParameters: { url: "https://example.com/key.gpg", state: "present" } },
  { id: 'apt_repository', module: 'ansible.builtin.apt_repository', name: 'Manage APT Repositories', icon: Layers, description: 'Add or remove APT repositories.', defaultParameters: { repo: "deb https://example.com/ubuntu focal main", state: "present" } },
];

const systemServiceModules: AnsibleModuleDefinition[] = [
  { id: 'service', module: 'ansible.builtin.service', name: 'Manage Service (Generic)', icon: Cog, description: 'Manage services (initd, systemd, etc.). Auto-detects service manager.', defaultParameters: { name: "sshd", state: "started", enabled: "yes" } },
  { id: 'systemd', module: 'ansible.builtin.systemd', name: 'Manage systemd Service/Unit', icon: Server, description: 'Control systemd units (services, timers, sockets).', defaultParameters: { name: "nginx.service", state: "restarted", enabled: "yes", daemon_reload: "no" } },
  { id: 'user', module: 'ansible.builtin.user', name: 'User Management', icon: UserCog, description: 'Manage user accounts and attributes.', defaultParameters: { name: "jdoe", comment: "Jane Doe", groups: "wheel,developers", state: "present" } },
  { id: 'group', module: 'ansible.builtin.group', name: 'Group Management', icon: Users2, description: 'Add or remove groups.', defaultParameters: { name: "webadmins", system: "yes", state: "present" } },
  { id: 'hostname', module: 'ansible.builtin.hostname', name: 'Manage Hostname', icon: Cpu, description: 'Manage system hostname.', defaultParameters: { name: "webserver01.example.com" } },
  { id: 'reboot', module: 'ansible.builtin.reboot', name: 'Reboot Machine', icon: Power, description: 'Reboot a machine, optionally waiting for it to come back.', defaultParameters: { reboot_timeout: 600, test_command: "whoami" } },
  { id: 'shutdown', module: 'ansible.builtin.shutdown', name: 'Shutdown Machine', icon: Power, description: 'Shutdown or power off machines.', defaultParameters: { delay: "+5" } },
  { id: 'mount', module: 'ansible.posix.mount', name: 'Manage Mount Points', icon: HardDrive, description: 'Control active and configured mount points (/etc/fstab).', defaultParameters: { path: "/mnt/data", src: "/dev/sdb1", fstype: "ext4", opts: "defaults,noatime", state: "mounted" } },
  { id: 'selinux', module: 'ansible.posix.selinux', name: 'Manage SELinux', icon: ShieldAlert, description: 'Manage SELinux state (enforcing, permissive, disabled) and booleans.', defaultParameters: { policy: "targeted", state: "enforcing" } },
  { id: 'sysctl', module: 'ansible.posix.sysctl', name: 'Manage Kernel Parameters (sysctl)', icon: Settings2, description: 'Configure kernel parameters using sysctl.', defaultParameters: { name: "net.ipv4.ip_forward", value: "1", sysctl_file: "/etc/sysctl.d/99-custom.conf", state: "present", reload: "yes" } },
  { id: 'cron', module: 'ansible.builtin.cron', name: 'Manage Cron Jobs', icon: CalendarClock, description: 'Manage cron jobs for users.', defaultParameters: { name: "backup_script", job: "/usr/local/bin/backup.sh", minute: "0", hour: "2", user: "root" } },
  { id: 'at', module: 'community.general.at', name: 'Schedule Ad-Hoc Tasks (at)', icon: CalendarClock, description: 'Schedule commands to be run once at a particular time.', defaultParameters: { command: "/usr/bin/updatedb", count: 1, units: "hours" } },
  { id: 'alternatives', module: 'community.general.alternatives', name: 'Manage Symbolic Links (alternatives)', icon: Shuffle, description: 'Manages symbolic links using the alternatives system (e.g., for Java, GCC).', defaultParameters: { name: "java", path: "/usr/lib/jvm/java-11-openjdk-amd64/bin/java" } },
  { id: 'authorized_key', module: 'ansible.posix.authorized_key', name: 'Manage SSH Authorized Keys', icon: KeySquare, description: 'Adds or removes SSH authorized keys for users.', defaultParameters: { user: "deploy", key: "ssh-rsa AAAA...", state: "present" } },
  { id: 'known_hosts', module: 'ansible.builtin.known_hosts', name: 'Manage SSH Known Hosts', icon: ServerCog, description: 'Add or remove host keys from SSH known_hosts.', defaultParameters: { name: "github.com", key: "github.com ssh-rsa AAAA...", state: "present" } },
  { id: 'modprobe', module: 'community.general.modprobe', name: 'Manage Kernel Modules', icon: Puzzle, description: 'Add or remove kernel modules.', defaultParameters: { name: "btrfs", state: "present" } },
  { id: 'service_facts', module: 'ansible.builtin.service_facts', name: 'Gather Service Facts', icon: ListTree, description: 'Return service state information as fact data.', defaultParameters: {} },
  { id: 'capabilities', module: 'community.general.capabilities', name: 'Manage File Capabilities', icon: ShieldCheck, description: 'Manage POSIX capabilities on files.', defaultParameters: { path: "/usr/sbin/nginx", capability: "cap_net_bind_service+eip", state: "present" } },
  { id: 'pam_limits', module: 'community.general.pam_limits', name: 'Manage PAM Limits', icon: Users, description: 'Modify PAM limits in /etc/security/limits.conf or /etc/security/limits.d/.', defaultParameters: { domain: "@users", limit_type: "soft", limit_item: "nofile", value: "65536" } },
  { id: 'syslog_facility', module: 'ansible.posix.syslog_facility', name: 'Configure Syslog', icon: FileText, description: 'Manage syslog facility configuration.', defaultParameters: { facility: "kern", level: "err", dest: "/var/log/kern_errors.log" } },
  { id: 'locale_gen', module: 'community.general.locale_gen', name: 'Generate Locales', icon: Globe, description: 'Creates or removes locales.', defaultParameters: { name: "en_US.UTF-8", state: "present" } },
  { id: 'timezone', module: 'community.general.timezone', name: 'Configure Timezone', icon: CalendarClock, description: 'Set the system timezone.', defaultParameters: { name: "Europe/London" } },
];

const networkingModules: AnsibleModuleDefinition[] = [
  { id: 'firewalld', module: 'ansible.posix.firewalld', name: 'Firewalld Rule/Service', icon: ShieldCheck, description: 'Manage firewall rules, services, and zones with firewalld.', defaultParameters: { service: "http", state: "enabled", permanent: "yes", immediate: "yes" } },
  { id: 'ufw', module: 'community.general.ufw', name: 'UFW Rule (Uncomplicated Firewall)', icon: Shield, description: 'Manage UFW firewall rules.', defaultParameters: { rule: "allow", port: "80", proto: "tcp", comment: "Allow HTTP" } },
  { id: 'iptables', module: 'ansible.builtin.iptables', name: 'iptables Rule', icon: Heater, description: 'Manage iptables rules (direct manipulation).', defaultParameters: { chain: "INPUT", protocol: "tcp", destination_port: "22", jump: "ACCEPT", comment: "Allow SSH" } },
  { id: 'nmcli', module: 'community.general.nmcli', name: 'NetworkManager Configuration', icon: NetworkIcon, description: 'Manage networking with NetworkManager via nmcli.', defaultParameters: { conn_name: "Wired_connection_1", ifname: "eth0", type: "ethernet", state: "present", ip4: "192.168.1.100/24", gw4: "192.168.1.1" } },
  { id: 'get_url', module: 'ansible.builtin.get_url', name: 'Download File (URL)', icon: DownloadCloud, description: 'Downloads files from HTTP, HTTPS, or FTP to remote nodes.', defaultParameters: { url: "https://example.com/software.tar.gz", dest: "/tmp/software.tar.gz", mode: "0644" } },
  { id: 'uri', module: 'ansible.builtin.uri', name: 'Interact with Web Services/APIs', icon: Cloud, description: 'Interacts with HTTP and HTTPS web services or APIs.', defaultParameters: { url: "https://api.example.com/status", method: "GET", return_content: "yes", status_code: [200, 201] } },
  { id: 'nftables', module: 'community.general.nftables', name: 'nftables Rule', icon: Shield, description: 'Manage nftables rules.', defaultParameters: { table: "inet-filter", chain: "input", rule: "tcp dport ssh accept", state: "present" } },
  { id: 'hostname_facts', module: 'ansible.builtin.hostname_facts', name: 'Gather Hostname Facts (Deprecated)', icon: Info, description: 'Gathers facts about the system hostname. (Deprecated, use ansible_facts.hostname).', defaultParameters: {} },
  { id: 'interfaces_file', module: 'community.general.interfaces_file', name: 'Manage Network Interfaces File (Debian)', icon: AlignCenter, description: 'Manages /etc/network/interfaces file on Debian-based systems.', defaultParameters: { name: "eth1", type: "static", address: "10.0.0.10/24", gateway: "10.0.0.1" } },
  { id: 'netplan', module: 'community.general.netplan', name: 'Configure Netplan (Ubuntu)', icon: Route, description: 'Configure netplan network settings on Ubuntu.', defaultParameters: { config_file: "/etc/netplan/01-custom.yaml", definition: { network: { version: 2, ethernets: { eth0: { dhcp4: true } } } } } },
  { id: 'listen_ports_facts', module: 'ansible.builtin.listen_ports_facts', name: 'Gather Listening Ports Facts', icon: Eye, description: 'Gathers facts about listening TCP and UDP ports.', defaultParameters: {} },
  { id: 'iptables_state', module: 'community.general.iptables_state', name: 'Save/Restore iptables State', icon: Save, description: 'Save or restore iptables state.', defaultParameters: { state: "saved", path: "/etc/iptables/rules.v4" } },
];

const sourceControlModules: AnsibleModuleDefinition[] = [
  { id: 'git', module: 'ansible.builtin.git', name: 'Git Repository Management', icon: GitFork, description: 'Deploy software from Git repositories (clone, update, checkout).', defaultParameters: { repo: "https://github.com/user/repo.git", dest: "/srv/myapp", version: "main", force: "yes" } },
  { id: 'subversion', module: 'community.general.subversion', name: 'Subversion (SVN) Repository', icon: Workflow, description: 'Manages Subversion (SVN) checkouts.', defaultParameters: { repo: "svn://svn.example.com/project/trunk", dest: "/srv/myproject", state: "checkout" } },
  { id: 'hg', module: 'community.general.hg', name: 'Mercurial (hg) Repository', icon: Shuffle, description: 'Manages Mercurial (hg) repositories.', defaultParameters: { repo: "https://hg.example.com/myrepo", dest: "/srv/myrepo" } },
];

const cloudManagementModules: AnsibleModuleDefinition[] = [
  // AWS
  { id: 'aws_s3_bucket', module: 'amazon.aws.s3_bucket', name: 'AWS S3 Bucket', icon: CloudCog, description: 'Manage S3 buckets in AWS.', defaultParameters: { name: "my-unique-bucket-name", state: "present", region: "us-east-1" } },
  { id: 'ec2_instance', module: 'amazon.aws.ec2_instance', name: 'AWS EC2 Instance', icon: Server, description: 'Create, terminate, start, or stop EC2 instances.', defaultParameters: { name: "my-instance", image_id: "ami-xxxxxxxxxxxxxxxxx", instance_type: "t2.micro", state: "present", region: "us-east-1" } },
  { id: 'rds_instance', module: 'amazon.aws.rds_instance', name: 'AWS RDS Instance', icon: Database, description: 'Manage RDS database instances.', defaultParameters: { db_instance_identifier: "my-db", db_instance_class: "db.t3.micro", engine: "mysql", allocated_storage: 20, state: "present", region: "us-east-1" } },
  { id: 'ec2_vpc_net', module: 'amazon.aws.ec2_vpc_net', name: 'AWS VPC Network', icon: NetworkIcon, description: 'Manage AWS VPC networks.', defaultParameters: { name: "my-vpc", cidr_block: "10.0.0.0/16", region: "us-east-1", state: "present" } },
  { id: 'iam_role', module: 'amazon.aws.iam_role', name: 'AWS IAM Role', icon: Users, description: 'Manage AWS IAM roles.', defaultParameters: { name: "my-app-role", assume_role_policy_document: "{...}", state: "present" } },
  { id: 'ec2_security_group', module: 'amazon.aws.ec2_security_group', name: 'AWS EC2 Security Group', icon: Shield, description: 'Manage EC2 security groups.', defaultParameters: { name: "my-sg", description: "My app security group", vpc_id: "vpc-xxxxxxxx", region: "us-east-1", state: "present" } },
  // GCP
  { id: 'gcp_compute_instance', module: 'google.cloud.gcp_compute_instance', name: 'GCP Compute Instance', icon: Server, description: 'Creates a GCP compute instance.', defaultParameters: { name: "my-gcp-instance", machine_type: "e2-medium", zone: "us-central1-a", project: "gcp-project-id", auth_kind: "serviceaccount", service_account_file: "/path/to/sa.json" } },
  { id: 'gcp_sql_instance', module: 'google.cloud.gcp_sql_instance', name: 'GCP SQL Instance', icon: Database, description: 'Creates a GCP Cloud SQL instance.', defaultParameters: { name: "my-gcp-db", region: "us-central1", settings: { tier: "db-f1-micro" }, project: "gcp-project-id", auth_kind: "serviceaccount" } },
  // Azure
  { id: 'azure_rm_virtualmachine', module: 'azure.azcollection.azure_rm_virtualmachine', name: 'Azure VM', icon: Server, description: 'Manage Azure Virtual Machines.', defaultParameters: { resource_group: "myResourceGroup", name: "myVM", vm_size: "Standard_DS1_v2", admin_username: "azureuser" } },
  { id: 'azure_rm_storageaccount', module: 'azure.azcollection.azure_rm_storageaccount', name: 'Azure Storage Account', icon: CloudUpload, description: 'Manage Azure Storage Accounts.', defaultParameters: { resource_group: "myResourceGroup", name: "mystorageaccount", account_type: "Standard_LRS" } },
  // Docker
  { id: 'docker_image', module: 'community.docker.docker_image', name: 'Docker Image Management', icon: Container, description: 'Build, pull, or manage Docker images.', defaultParameters: { name: "nginx", source: "pull", state: "present" } },
  { id: 'docker_container', module: 'community.docker.docker_container', name: 'Docker Container Management', icon: Container, description: 'Manage Docker containers.', defaultParameters: { name: "my_web_server", image: "nginx:latest", state: "started", ports: ["8080:80"] } },
  { id: 'docker_network', module: 'community.docker.docker_network', name: 'Docker Network Management', icon: NetworkIcon, description: 'Manage Docker networks.', defaultParameters: { name: "my_app_network", state: "present" } },
  { id: 'docker_volume', module: 'community.docker.docker_volume', name: 'Docker Volume Management', icon: HardDrive, description: 'Manage Docker volumes.', defaultParameters: { name: "my_data_volume", state: "present" } },
  { id: 'docker_compose', module: 'community.docker.docker_compose', name: 'Docker Compose', icon: Layers, description: 'Manage multi-container Docker applications with Docker Compose.', defaultParameters: { project_src: "/srv/my-app", state: "present" } },
];

const databaseManagementModules: AnsibleModuleDefinition[] = [
  { id: 'mysql_db', module: 'community.mysql.mysql_db', name: 'MySQL Database', icon: DatabaseZap, description: 'Create or delete MySQL databases.', defaultParameters: { name: "mydatabase", state: "present", login_user: "root", login_password: "password" } },
  { id: 'mysql_user', module: 'community.mysql.mysql_user', name: 'MySQL User', icon: UserCog, description: 'Manage MySQL users and their privileges.', defaultParameters: { name: "dbuser", password: "userpass", priv: "*.*:ALL", state: "present" } },
  { id: 'postgresql_db', module: 'community.postgresql.postgresql_db', name: 'PostgreSQL Database', icon: DatabaseZap, description: 'Create or delete PostgreSQL databases.', defaultParameters: { name: "mydatabase", state: "present", login_user: "postgres" } },
  { id: 'postgresql_user', module: 'community.postgresql.postgresql_user', name: 'PostgreSQL User', icon: UserCog, description: 'Manage PostgreSQL users and their privileges.', defaultParameters: { name: "dbuser", password: "userpass", state: "present" } },
  { id: 'mongodb_user', module: 'community.mongodb.mongodb_user', name: 'MongoDB User', icon: UserCog, description: 'Manages MongoDB users.', defaultParameters: { login_database: "admin", name: "mongouser", password: "userpass", roles: [{db: "mydatabase", role: "readWrite"}], state: "present" } },
  { id: 'redis_config', module: 'community.general.redis_config', name: 'Redis Configuration', icon: Settings2, description: 'Manages Redis configuration settings.', defaultParameters: { parameter: "maxmemory", value: "2gb" } },
  { id: 'mysql_replication', module: 'community.mysql.mysql_replication', name: 'MySQL Replication', icon: GitFork, description: 'Manage MySQL replication settings.', defaultParameters: { mode: "startreplica", master_host: "master.example.com" } },
  { id: 'postgresql_privs', module: 'community.postgresql.postgresql_privs', name: 'PostgreSQL Privileges', icon: Lock, description: 'Grant or revoke PostgreSQL privileges.', defaultParameters: { db: "mydatabase", privs: "ALL", type: "table", objs: "my_table", role: "app_user" } },
];

const utilityExecutionModules: AnsibleModuleDefinition[] = [
  { id: 'debug', module: 'ansible.builtin.debug', name: 'Debug Message/Variable', icon: TerminalSquare, description: 'Print statements or variable values during execution.', defaultParameters: { msg: "Current value of my_var is {{ my_var }}" } },
  { id: 'command', module: 'ansible.builtin.command', name: 'Execute Command (Non-Shell)', icon: Shell, description: 'Executes a command on the remote node (not through a shell).', defaultParameters: { cmd: "/usr/bin/uptime", warn: "no" } },
  { id: 'shell', module: 'ansible.builtin.shell', name: 'Execute Shell Command', icon: TerminalSquare, description: 'Executes commands in a shell on the remote node.', defaultParameters: { cmd: "echo $HOSTNAME > /tmp/hostname.txt", executable: "/bin/bash" } },
  { id: 'script', module: 'ansible.builtin.script', name: 'Run Local Script on Remote', icon: FileCode, description: 'Runs a local script on a remote node after transferring it.', defaultParameters: { cmd: "/path/to/local_script.sh arg1 arg2" } },
  { id: 'raw', module: 'ansible.builtin.raw', name: 'Execute Raw Command (Low-Level)', icon: Lightbulb, description: 'Executes a low-down and dirty SSH command, not going through the module subsystem.', defaultParameters: { cmd: "sudo apt-get update -y" } },
  { id: 'unarchive', module: 'ansible.builtin.unarchive', name: 'Unarchive File', icon: ArchiveRestore, description: 'Unpacks an archive (e.g., .zip, .tar.gz) on the remote node.', defaultParameters: { src: "/tmp/archive.zip", dest: "/opt/", remote_src: "no" } },
  { id: 'archive', module: 'community.general.archive', name: 'Create Archive', icon: ArchiveIcon, description: 'Creates a compressed archive of files from the remote node.', defaultParameters: { path: "/var/log/myapp/*", dest: "/tmp/myapp_logs.tar.gz", format: "gz" } },
  { id: 'set_fact', module: 'ansible.builtin.set_fact', name: 'Set Fact (Variable)', icon: SlidersHorizontal, description: 'Set new variables (facts) in the play dynamically.', defaultParameters: { my_custom_fact: "some_dynamic_value", cacheable: "yes" } },
  { id: 'fail', module: 'ansible.builtin.fail', name: 'Fail Playbook', icon: AlertCircle, description: 'Fail the play with a custom message if a condition is not met.', defaultParameters: { msg: "A critical condition was not met. Halting execution." } },
  { id: 'assert', module: 'ansible.builtin.assert', name: 'Assert Condition', icon: CheckCircle2, description: 'Asserts given expressions are true, fails if not.', defaultParameters: { that: "ansible_distribution == 'Ubuntu' and ansible_distribution_version == '22.04'", fail_msg: "This role requires Ubuntu 22.04.", success_msg: "System is Ubuntu 22.04." } },
  { id: 'wait_for', module: 'ansible.builtin.wait_for', name: 'Wait For Condition/Port', icon: Hourglass, description: 'Waits for a condition (e.g., port open, file exists, string in output) before continuing.', defaultParameters: { host: "db.example.com", port: 3306, state: "started", delay: 5, timeout: 300, msg: "Waiting for database server to be ready..." } },
  { id: 'slurp', module: 'ansible.builtin.slurp', name: 'Slurp File Content to Fact', icon: FilePlus, description: 'Slurps a file from remote nodes into a registered variable.', defaultParameters: { src: "/etc/os-release" } },
  { id: 'setup', module: 'ansible.builtin.setup', name: 'Gather Facts (Explicitly)', icon: Info, description: 'Gathers facts about remote hosts. Usually run implicitly.', defaultParameters: { filter: "ansible_distribution*", gather_subset: "!all,min" } },
  { id: 'include_role', module: 'ansible.builtin.include_role', name: 'Include Role Dynamically', icon: ListChecks, description: 'Load and execute an Ansible role dynamically.', defaultParameters: { name: "common_setup_role" } },
  { id: 'import_role', module: 'ansible.builtin.import_role', name: 'Import Role Statically', icon: ListChecks, description: 'Load and execute an Ansible role statically at parse time.', defaultParameters: { name: "security_hardening" } },
  { id: 'include_tasks', module: 'ansible.builtin.include_tasks', name: 'Include Task File Dynamically', icon: Braces, description: 'Includes a file with a list of tasks dynamically.', defaultParameters: { file: "setup_users.yml" } },
  { id: 'import_tasks', module: 'ansible.builtin.import_tasks', name: 'Import Task File Statically', icon: Braces, description: 'Imports a file with a list of tasks statically at parse time.', defaultParameters: { file: "configure_firewall.yml" } },
  { id: 'add_host', module: 'ansible.builtin.add_host', name: 'Add Host to Inventory (In-Memory)', icon: PackagePlus, description: 'Add a host (and optionally groups) to the ansible-playbook in-memory inventory.', defaultParameters: { name: "new_dynamic_host", groups: "webservers,production", ansible_host: "10.0.1.50"} },
  { id: 'group_by', module: 'ansible.builtin.group_by', name: 'Group Hosts (In-Memory)', icon: Layers, description: 'Create new groups in inventory based on variables.', defaultParameters: { key: "os_{{ ansible_facts.distribution }}" } },
  { id: 'pause', module: 'ansible.builtin.pause', name: 'Pause Playbook Execution', icon: Hourglass, description: 'Pauses playbook execution for a set amount of time or until a prompt is acknowledged.', defaultParameters: { minutes: 1, prompt: "Review the previous steps. Press Enter to continue or Ctrl+C and A to abort." } },
  { id: 'meta', module: 'ansible.builtin.meta', name: 'Execute Ansible Meta Actions', icon: Workflow, description: 'Executes Ansible meta actions like flush_handlers, refresh_inventory, end_play.', defaultParameters: { action: "flush_handlers" } },
  { id: 'ping', module: 'ansible.builtin.ping', name: 'Ping Hosts', icon: TestTube2, description: 'Try to connect to host, verify a usable python and return pong on success.', defaultParameters: {} },
  { id: 'gather_facts', module: 'ansible.builtin.gather_facts', name: 'Control Fact Gathering', icon: Info, description: 'Explicitly controls fact gathering for a play.', defaultParameters: { enabled: "no" } }, 
  { id: 'delegate_to', module: 'delegate_to', name: 'Delegate Task Keyword', icon: Waypoints, description: 'Run a task on a different host than the current target.', defaultParameters: { host: "localhost" } }, 
  { id: 'run_once', module: 'run_once', name: 'Run Task Once Keyword', icon: MessageSquare, description: 'Run a task only on the first host in the current batch.', defaultParameters: { enabled: "yes" } }, 
  { id: 'tags', module: 'tags', name: 'Tag Management Keyword', icon: ToggleLeft, description: 'Add tags to tasks or plays for selective execution.', defaultParameters: { names: ["configuration", "security"]}}, 
  { id: 'openssl_privatekey', module: 'community.crypto.openssl_privatekey', name: 'Generate OpenSSL Private Key', icon: KeyRound, description: 'Generate OpenSSL private keys.', defaultParameters: { path: "/etc/ssl/private/mykey.pem", size: 2048 } },
  { id: 'x509_certificate', module: 'community.crypto.x509_certificate', name: 'Generate X.509 Certificate', icon: FileBadge, description: 'Generate self-signed X.509 certificates.', defaultParameters: { path: "/etc/ssl/certs/mycert.pem", privatekey_path: "/etc/ssl/private/mykey.pem", provider: "selfsigned" } },
  { id: 'include_vars', module: 'ansible.builtin.include_vars', name: 'Include Variables File', icon: FileSymlink, description: 'Load variables from files dynamically.', defaultParameters: { file: "vars/my_vars.yml" } },
  { id: 'set_stats', module: 'ansible.builtin.set_stats', name: 'Set Custom Stats', icon: BarChartBig, description: 'Set custom stats for the playbook run.', defaultParameters: { data: { my_stat: "value" }, per_host: "yes" } },
  { id: 'wakeonlan', module: 'community.general.wakeonlan', name: 'Wake-on-LAN', icon: Power, description: 'Sends a Wake-on-LAN (Magic Packet) to a remote host.', defaultParameters: { mac: "00:11:22:AA:BB:CC", broadcast: "192.168.1.255", state: "present" } },
];

const hashicorpModules: AnsibleModuleDefinition[] = [
  { 
    id: 'vault_kv2_get', 
    module: 'community.hashi_vault.vault_kv2_get', 
    name: 'Vault KV v2 Get Secret', 
    icon: KeyRound, 
    description: 'Read secrets from HashiCorp Vault KV v2 engine.', 
    defaultParameters: { 
      path: "secret/data/myapp/config", 
      mount_point: "secret", 
      auth_method: "token", 
      url: "https://vault.example.com:8200" 
    } 
  },
  { 
    id: 'vault_write', 
    module: 'community.hashi_vault.vault_write', 
    name: 'Vault Write Data', 
    icon: FileLock2, 
    description: 'Write data to a path in HashiCorp Vault.', 
    defaultParameters: { 
      path: "secret/data/myapp/new_secret", 
      mount_point: "secret",
      data: { key1: "value1", key2: "value2" }, 
      auth_method: "token", 
      url: "https://vault.example.com:8200" 
    } 
  },
  { 
    id: 'consul_kv', 
    module: 'community.general.consul_kv', 
    name: 'Consul K/V Management', 
    icon: Database, 
    description: 'Manage key/value pairs in HashiCorp Consul.', 
    defaultParameters: { 
      key: "myapp/config/version", 
      value: "1.2.3", 
      state: "present", 
      host: "consul.example.com", 
      port: 8500 
    } 
  },
  { 
    id: 'consul_service', 
    module: 'community.general.consul_service', 
    name: 'Consul Service Management', 
    icon: ServerCog, 
    description: 'Register or deregister services with HashiCorp Consul.', 
    defaultParameters: { 
      name: "my-app-instance-1", 
      service_id: "my-app-1",
      port: 8080, 
      tags: ["web", "production"], 
      state: "present", 
      host: "consul.example.com" 
    } 
  },
  { 
    id: 'terraform', 
    module: 'community.general.terraform', 
    name: 'Terraform Execution', 
    icon: Layers3, 
    description: 'Run Terraform commands (init, plan, apply, destroy).', 
    defaultParameters: { 
      project_path: "/srv/terraform/my-project", 
      state: "present", 
      force_init: "yes"
    } 
  },
  { 
    id: 'nomad_job', 
    module: 'community.general.nomad_job', 
    name: 'Nomad Job Management', 
    icon: Container, 
    description: 'Manage HashiCorp Nomad jobs.', 
    defaultParameters: { 
      path: "/path/to/myjob.nomad.hcl", 
      state: "present", 
      host: "nomad.example.com", 
      port: 4646 
    } 
  },
];

const proxmoxModules: AnsibleModuleDefinition[] = [
  {
    id: 'proxmox_kvm',
    module: 'community.general.proxmox_kvm',
    name: 'Proxmox KVM',
    icon: Server,
    description: 'Manage KVM virtual machines on Proxmox VE.',
    defaultParameters: {
      api_host: 'proxmox.example.com',
      api_user: 'root@pam',
      api_password: 'YOUR_PASSWORD',
      node: 'pve',
      name: 'my-vm',
      state: 'present',
      cores: 1,
      memory: 1024,
    },
  },
  {
    id: 'proxmox_lxc',
    module: 'community.general.proxmox_lxc',
    name: 'Proxmox LXC',
    icon: Container,
    description: 'Manage LXC containers on Proxmox VE.',
    defaultParameters: {
      api_host: 'proxmox.example.com',
      api_user: 'root@pam',
      api_password: 'YOUR_PASSWORD',
      node: 'pve',
      hostname: 'my-container',
      state: 'present',
      cores: 1,
      memory: 512,
      ostemplate: 'local:vztmpl/ubuntu-20.04-standard_20.04-1_amd64.tar.gz'
    },
  },
  {
    id: 'proxmox_pool_member',
    module: 'community.general.proxmox_pool_member',
    name: 'Proxmox Pool Member',
    icon: Layers,
    description: 'Manage Proxmox VE pool members (VMs, containers, storage).',
    defaultParameters: {
      api_host: 'proxmox.example.com',
      api_user: 'root@pam',
      api_password: 'YOUR_PASSWORD',
      pool: 'my-resource-pool',
      vmid: 100, // Example VM ID
      state: 'present',
    },
  },
  {
    id: 'proxmox_template',
    module: 'community.general.proxmox_template',
    name: 'Proxmox Template Management',
    icon: Copy,
    description: 'Manage Proxmox VE templates (create, delete).',
    defaultParameters: {
      api_host: 'proxmox.example.com',
      api_user: 'root@pam',
      api_password: 'YOUR_PASSWORD',
      node: 'pve',
      vmid: 100, // VM ID to convert to template
      name: 'my-template-name',
      state: 'present',
    },
  },
];

const vmwareModules: AnsibleModuleDefinition[] = [
  {
    id: 'vmware_guest',
    module: 'community.vmware.vmware_guest',
    name: 'VMware Guest Management',
    icon: Server,
    description: 'Manage VMware vSphere virtual machines (power state, configuration, etc.).',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      datacenter: 'Datacenter1',
      name: 'my-vm',
      state: 'present', // e.g., present, poweredon, poweredoff, restarted
      guest_id: 'centos7_64Guest',
      disk: [{ size_gb: 40, type: 'thin', datastore: 'datastore1' }],
      networks: [{ name: 'VM Network', ip: '192.168.1.100', netmask: '255.255.255.0', gateway: '192.168.1.1' }],
      validate_certs: 'no',
    },
  },
  {
    id: 'vmware_guest_info',
    module: 'community.vmware.vmware_guest_info',
    name: 'VMware Guest Info',
    icon: Info,
    description: 'Gather information about VMware vSphere virtual machines.',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      validate_certs: 'no',
      // name: 'specific-vm-name', // Optional: to get info for a specific VM
    },
  },
  {
    id: 'vmware_guest_snapshot',
    module: 'community.vmware.vmware_guest_snapshot',
    name: 'VMware Guest Snapshot',
    icon: Camera,
    description: 'Manage snapshots of VMware vSphere virtual machines.',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      datacenter: 'Datacenter1',
      uuid: 'vm-uuid-here', // or name: 'vm-name-here'
      snapshot_name: 'my_snapshot_before_update',
      state: 'present', // e.g., present, absent, revert
      validate_certs: 'no',
    },
  },
  {
    id: 'vmware_datacenter',
    module: 'community.vmware.vmware_datacenter',
    name: 'VMware Datacenter',
    icon: Building,
    description: 'Manage datacenters in VMware vSphere.',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      datacenter_name: 'NewDatacenter',
      state: 'present',
      validate_certs: 'no',
    },
  },
  {
    id: 'vmware_folder',
    module: 'community.vmware.vmware_folder',
    name: 'VMware VM Folder',
    icon: FolderOpen,
    description: 'Manage VM inventory folders in VMware vSphere.',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      datacenter_name: 'Datacenter1',
      folder_name: '/MyProject/WebServers',
      folder_type: 'vm', // or host, datastore, network
      state: 'present',
      validate_certs: 'no',
    },
  },
  {
    id: 'vmware_tag_manager',
    module: 'community.vmware.vmware_tag_manager',
    name: 'VMware Tag Manager',
    icon: Tags,
    description: 'Manage tags and categories in VMware vSphere.',
    defaultParameters: {
      hostname: 'vcenter.example.com',
      username: 'user@vsphere.local',
      password: 'YOUR_PASSWORD',
      category_name: 'Environment',
      tag_name: 'Production',
      state: 'present',
      validate_certs: 'no',
    },
  },
];

const microsoftWindowsModules: AnsibleModuleDefinition[] = [
  {
    id: 'win_feature',
    module: 'community.windows.win_feature',
    name: 'Windows Feature/Role',
    icon: ListChecks,
    description: 'Manages Windows features and roles (e.g., IIS, Hyper-V).',
    defaultParameters: { name: "Web-Server", state: "present", include_management_tools: "yes" },
  },
  {
    id: 'win_package',
    module: 'community.windows.win_package',
    name: 'Windows Package',
    icon: Package,
    description: 'Installs/uninstalls MSI, .exe, or other package types on Windows.',
    defaultParameters: { path: "C:\\temp\\installer.msi", state: "present" },
  },
  {
    id: 'win_service',
    module: 'community.windows.win_service',
    name: 'Windows Service',
    icon: Cog,
    description: 'Manages Windows services (start, stop, restart, enable, disable).',
    defaultParameters: { name: "Spooler", state: "started", start_mode: "auto" },
  },
  {
    id: 'win_user',
    module: 'community.windows.win_user',
    name: 'Windows User',
    icon: UserCog,
    description: 'Manages local user accounts on Windows.',
    defaultParameters: { name: "appuser", password: "SecurePassword123!", state: "present", groups: ["Users"], password_never_expires: "yes" },
  },
  {
    id: 'win_reboot',
    module: 'community.windows.win_reboot',
    name: 'Windows Reboot',
    icon: Power,
    description: 'Reboots a Windows machine, optionally waiting for it to come back.',
    defaultParameters: { reboot_timeout: 600, test_command: "whoami" },
  },
  {
    id: 'win_domain_membership',
    module: 'community.windows.win_domain_membership',
    name: 'Windows Domain Membership',
    icon: Users, // Using 'Users' as it implies joining a user directory/domain
    description: 'Manages a Windows host\'s domain membership.',
    defaultParameters: { dns_domain_name: "corp.example.com", hostname: "WINCLIENT01", domain_admin_user: "administrator@corp.example.com", domain_admin_password: "AdminPassword123!", state: "domain" },
  },
  {
    id: 'sqlserver_db',
    module: 'community.sqlserver.sqlserver_db',
    name: 'SQL Server Database',
    icon: Database,
    description: 'Manages SQL Server databases (create, delete).',
    defaultParameters: { name: "MyApplicationDB", state: "present", login_host: "sqlserver.example.com", login_user: "sa", login_password: "SAPassword123!" },
  },
];


export const moduleGroups: AnsibleModuleGroup[] = [
  { 
    name: "File Management", 
    icon: FolderOpen, 
    modules: fileManagementModules 
  },
  { 
    name: "Package Management", 
    icon: Package, 
    modules: packageManagementModules 
  },
  { 
    name: "System & Services", 
    icon: ServerCog, 
    modules: systemServiceModules 
  },
  { 
    name: "Networking", 
    icon: Globe, 
    modules: networkingModules 
  },
  { 
    name: "Source Control", 
    icon: GitFork, 
    modules: sourceControlModules 
  },
  {
    name: "Cloud Management",
    icon: CloudCog,
    modules: cloudManagementModules
  },
  {
    name: "Database Management",
    icon: Database,
    modules: databaseManagementModules
  },
  { 
    name: "Utilities & Execution", 
    icon: SquareCode, 
    modules: utilityExecutionModules 
  },
  {
    name: "HashiCorp",
    icon: Shapes,
    modules: hashicorpModules
  },
  {
    name: "Virtualization / Proxmox VE",
    icon: ServerCog, 
    modules: proxmoxModules
  },
  {
    name: "Virtualization / VMware",
    icon: Layers3,
    modules: vmwareModules
  },
  {
    name: "Microsoft / Windows",
    icon: Laptop,
    modules: microsoftWindowsModules
  }
];
