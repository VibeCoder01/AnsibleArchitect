import { AnsibleArchitectLayout } from "@/components/ansible-architect-layout";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AnsibleArchitectLayout />
    </SidebarProvider>
  );
}
