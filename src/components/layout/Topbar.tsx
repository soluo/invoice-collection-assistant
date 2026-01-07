import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, FileText, Calendar, Settings, User, ChevronDown, Mail, Users } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
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

function getUserDisplayName(user: MaybeUser) {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0];
    }
    // Format: "Prénom P."
    return `${parts[0]} ${parts[1][0]}.`;
  }
  const email = user?.email;
  if (email) {
    const localPart = email.split("@")[0];
    return localPart;
  }
  return "Utilisateur";
}

export function Topbar() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = () => {
    setIsMenuOpen(false);
    void signOut();
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
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

  const navItems = [
    { name: "Factures", path: "/invoices" },
    { name: "Relances", path: "/follow-up" },
  ];

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-6 flex items-center gap-6">
        {/* Mobile hamburger trigger */}
        <SidebarTrigger className="md:hidden" />

        {/* Logo (desktop only) */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Relance<span className="text-brand-500">Zen</span>
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-brand-600 bg-brand-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )
                }
              >
                {item.name}
              </NavLink>
            );
          })}
          {/* Admin-only links */}
          {loggedInUser?.role === "admin" && (
            <>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-brand-600 bg-brand-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )
                }
              >
                Équipe
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-brand-600 bg-brand-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )
                }
              >
                Réglages
              </NavLink>
            </>
          )}
        </nav>

        {/* Right side: User avatar with dropdown */}
        <div className="flex items-center gap-4 ml-auto">
          {/* User menu */}
          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:bg-slate-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <Avatar className="h-8 w-8 bg-primary text-white">
              <AvatarFallback className="bg-primary text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-slate-700 hidden sm:block">
              {getUserDisplayName(loggedInUser)}
            </span>
            <ChevronDown className="text-xs text-slate-400 h-3 w-3" />
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute right-0 z-30 mt-3 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                {loggedInUser?.email && (
                  <p className="mt-1 text-sm text-gray-500">{loggedInUser.email}</p>
                )}
              </div>
              <div className="py-1">
                {loggedInUser?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => handleNavigate("/settings")}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Settings size={18} />
                    Réglages
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNavigate("/account")}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <User size={18} />
                  Mon Compte
                </button>
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
        </div>
      </div>
    </header>
  );
}
