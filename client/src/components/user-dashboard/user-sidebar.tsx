import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Briefcase,
  LayoutDashboard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar"
import { NavMain } from "../admin-dashboard/nav-main"
import { NavUser } from "../admin-dashboard/nav-user"
import { useAuth } from "../../hooks/useAuth"

export function UserSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const location = useLocation()

  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: location.pathname === "/",
    },
    {
      title: "Jobs",
      url: "/jobs",
      icon: Briefcase,
      isActive: location.pathname === "/jobs" || location.pathname.startsWith("/jobs/"),
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" className="flex flex-col" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Briefcase className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SkillSync</span>
                  <span className="truncate text-xs">Candidate Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
