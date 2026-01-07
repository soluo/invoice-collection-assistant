import React from 'react'
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar (mobile only - overlay) */}
        <Sidebar />

        {/* Main content area (full width on desktop) */}
        <SidebarInset className="bg-gray-50 w-full">
          {/* Topbar with logo and nav on desktop */}
          <Topbar />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto py-4 md:py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
