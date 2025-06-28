
export interface AnsibleModuleDefinition {
  id: string;
  name: string; // e.g., "APT Package Management"
  module: string; // e.g., "apt"
  description: string;
  icon?: React.ElementType;
  defaultParameters?: Record<string, any>;
}

export interface AnsibleModuleGroup {
  name: string;
  icon?: React.ElementType; // Optional icon for the group
  modules: AnsibleModuleDefinition[];
}

export interface AnsibleTask {
  id: string; // Unique ID for the task in the playbook
  name: string; // User-defined name for the task, e.g., "Install nginx"
  module: string; // Ansible module, e.g., "apt"
  parameters: Record<string, any>; // Parameters for the module
  rawYAML?: string; // Store AI suggested task YAML directly
  comment?: string; // Optional comment for the task
  isPristine?: boolean; // True if the task parameters haven't been modified from default
}

export interface AnsiblePlay {
  id: string;
  name: string;
  hosts: string;
  become?: boolean;
  tasks: AnsibleTask[];
}

export type AnsiblePlaybookYAML = AnsiblePlay[]; // Represents the structure written to YAML

// Reference to a defined Ansible Role (name only for now)
export interface AnsibleRoleRef {
  id:string;
  name: string;
}

// Represents the state of a single file open in the designer
export interface DesignerFileState {
  id: string; // Unique ID for this file instance (usually the file path)
  name: string; // User-defined name, e.g., "webservers.yml"
  tasks: AnsibleTask[]; // The blocks/tasks parsed from the file
  // Future: unsavedChanges?: boolean;
}

// Types for Project Import/Export
export interface ProjectFile {
  path: string;
  content: string;
  isDefault?: boolean;
}

export interface Project {
  name: string;
  files: ProjectFile[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  isDefault?: boolean;
}
