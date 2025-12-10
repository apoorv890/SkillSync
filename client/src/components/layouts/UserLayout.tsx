import { SidebarProvider } from "../ui/sidebar"
import { UserSidebar } from "../user-dashboard/user-sidebar"

interface UserLayoutProps {
  children: React.ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  // Get default open state from localStorage
  const defaultOpen = localStorage.getItem("sidebar:state") === "true"

  return (
    <SidebarProvider
      defaultOpen={defaultOpen !== false}
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <div className="flex h-screen w-full">
        <UserSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
