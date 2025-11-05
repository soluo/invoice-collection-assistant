import { useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Doc } from "../../../convex/_generated/dataModel";

type MaybeUser = Doc<"users"> | null | undefined;

function getUserInitials(user: MaybeUser) {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const email = user?.email;
  if (email) {
    const localPart = email.split("@")[0];
    return localPart.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function Topbar() {
  const { signOut } = useAuthActions();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = () => {
    setIsMenuOpen(false);
    void signOut();
  };

  // Close menu on click outside
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const initials = getUserInitials(loggedInUser);
  const displayName = loggedInUser?.name || "Utilisateur";
  const greeting = getGreeting();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-16 px-4 md:px-6 flex items-center gap-4">
      {/* Mobile hamburger trigger */}
      <SidebarTrigger className="md:hidden" />

      {/* Greeting (hidden on small screens) */}
      <div className="hidden sm:block flex-1">
        <p className="text-sm text-gray-600">
          {greeting}, <span className="font-medium text-gray-900">{displayName}</span>
        </p>
      </div>

      {/* Right side: User avatar with dropdown */}
      <div className="relative ml-auto" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          <Avatar className="h-10 w-10 bg-indigo-600 text-white">
            <AvatarFallback className="bg-indigo-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div className="absolute right-0 z-30 mt-3 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              {loggedInUser?.email && (
                <p className="mt-1 text-sm text-gray-500">{loggedInUser.email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 18) return "Bonjour";
  return "Bonsoir";
}
