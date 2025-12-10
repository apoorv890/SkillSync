import { SidebarProvider } from "../ui/sidebar"
import { AppSidebar } from "./app-sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
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
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
