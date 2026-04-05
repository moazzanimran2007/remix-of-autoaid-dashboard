import { NavLink } from "react-router-dom";
import { ClipboardList, Plus, Users, BookOpen, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", icon: ClipboardList, label: "Jobs", end: true },
  { to: "/mechanics", icon: Users, label: "Mechanics" },
  { to: "/knowledge-base", icon: BookOpen, label: "KB" },
];

export function BottomNav() {
  const { roles } = useAuth();
  const isOwnerOrAdmin = roles.includes("shop_owner") || roles.includes("admin");
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-foreground/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        {/* FAB */}
        <NavLink
          to="/chat"
          className="flex items-center justify-center -mt-5 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
        </NavLink>

        {navItems.slice(1).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        {isOwnerOrAdmin && (
          <NavLink
            to="/team"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Team</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
