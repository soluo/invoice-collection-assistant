import React from 'react'
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import {
  FileText,
  Calendar,
  Phone,
  Settings,
  User,
  Mail,
  Users,
} from "lucide-react";
import { cn, isAdminRole } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sidebar as SidebarComp,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: "Factures", path: "/invoices", icon: FileText },
  { name: "Relances", path: "/follow-up", icon: Calendar },
];

const bottomNavItems: NavItem[] = [
  { name: "Mon Compte", path: "/account", icon: User },
];

function NavItem({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const Icon = item.icon;
  const resolved = useResolvedPath(item.path);
  const match = useMatch({ path: resolved.pathname, end: true });
  const isActive = !!match;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <NavLink to={item.path} onClick={onClick}>
          <Icon className="h-5 w-5" />
          <span>{item.name}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function Sidebar() {
  const { setOpenMobile } = useSidebar();
  const loggedInUser = useQuery(api.auth.loggedInUser);

  return (
    <SidebarComp className="md:hidden">
      {/* Header avec logo */}
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Relance<span className="text-brand-500">Zen</span>
          </h1>
        </div>
      </SidebarHeader>

      {/* Main content */}
      <SidebarContent>
        {/* Main navigation group */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClick={() => setOpenMobile(false)} />
              ))}
              {/* Admin-only links (admin or superadmin) */}
              {isAdminRole(loggedInUser?.role) && (
                <>
                  <NavItem
                    item={{ name: "Équipe", path: "/team", icon: Users }}
                    onClick={() => setOpenMobile(false)}
                  />
                  <NavItem
                    item={{ name: "Réglages", path: "/settings", icon: Settings }}
                    onClick={() => setOpenMobile(false)}
                  />
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer navigation */}
      <SidebarFooter>
        <SidebarMenu>
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} item={item} onClick={() => setOpenMobile(false)} />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComp>
  );
}
