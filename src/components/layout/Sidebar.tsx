import React from 'react'
import { NavLink, useMatch, useResolvedPath } from "react-router-dom";
import {
  Home,
  FileText,
  Users,
  Phone,
  Upload,
  CreditCard,
  Calendar,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  { name: "Tableau de bord", path: "/", icon: Home },
  { name: "Import Facture", path: "/upload", icon: Upload },
  /*{ name: "Clients", path: "/clients", icon: Users },*/
  { name: "Clients à appeler", path: "/call-plan", icon: Phone },
  { name: "Rapprochement", path: "/reconciliation", icon: CreditCard },
  { name: "Factures", path: "/invoices", icon: FileText },
  { name: "Agenda", path: "/agenda", icon: Calendar },
];

const bottomNavItems: NavItem[] = [
  { name: "Réglages", path: "/settings", icon: Settings },
  { name: "Mon Compte", path: "/account", icon: User },
];

function NavItem({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const Icon = item.icon;
  const resolved = useResolvedPath(item.path);
  const match = useMatch({ path: resolved.pathname, end: item.path === "/" });
  const isActive = !!match;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <NavLink to={item.path} onClick={onClick}>
          <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
          <span>{item.name}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function Sidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarComp>
      {/* Header avec logo */}
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            Z
          </div>
          <h1 className="text-lg font-bold text-foreground">ZenRelance</h1>
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
