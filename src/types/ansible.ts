
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
}

export interface AnsiblePlay {
  id: string;
  name: string;
  hosts: string;
  become?: boolean;
  tasks: AnsibleTask[];
}

export type AnsiblePlaybook = AnsiblePlay[];

// Reference to a defined Ansible Role (name only for now)
export interface AnsibleRoleRef {
  id: string;
  name: string;
}
