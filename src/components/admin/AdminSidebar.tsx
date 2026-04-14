"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },
  {
    href: "/admin/sessions",
    icon: Calendar,
    label: "Sessions",
  },
  {
    href: "/admin/participants",
    icon: Users,
    label: "Participants",
  },
  {
    href: "/admin/attendance",
    icon: ClipboardCheck,
    label: "Attendance",
  },
  {
    href: "/admin/programmes",
    icon: BookOpen,
    label: "Programmes",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 min-h-screen bg-[#173d35] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-sm font-bold">SE</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Santunan Emas</p>
            <p className="text-xs text-white/60 leading-tight">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                active
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{(link as any).label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="size-5 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium leading-tight">Sign Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
