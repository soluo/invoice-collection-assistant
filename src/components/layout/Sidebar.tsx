import React from 'react'
import { NavLink } from "react-router-dom";
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: "Tableau de bord", path: "/", icon: Home },
  { name: "Factures", path: "/invoices", icon: FileText },
  { name: "Clients", path: "/clients", icon: Users },
  { name: "Clients à appeler", path: "/call-plan", icon: Phone },
  { name: "Import Facture", path: "/upload", icon: Upload },
  { name: "Rapprochement", path: "/reconciliation", icon: CreditCard },
  { name: "Agenda", path: "/agenda", icon: Calendar },
];

const bottomNavItems: NavItem[] = [
  { name: "Réglages", path: "/settings", icon: Settings },
  { name: "Mon Compte", path: "/account", icon: User },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out",
          "md:translate-x-0", // Always visible on desktop
          isOpen ? "translate-x-0" : "-translate-x-full" // Toggle on mobile
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-indigo-600">ZenRelance</h1>
          </div>

          {/* Main navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        )
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-gray-200 py-4 px-3">
            <ul className="space-y-1">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        )
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
