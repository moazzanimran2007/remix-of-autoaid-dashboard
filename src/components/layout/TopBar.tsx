import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationPanel";

export function TopBar() {
  const { profile, roles, signOut } = useAuth();

  const roleLabel = roles.includes('admin') ? 'Admin' :
    roles.includes('shop_owner') ? 'Shop Owner' :
    roles.includes('mechanic') ? 'Mechanic' : '';

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-foreground">Mech</span>
          <span className="text-primary">AI</span>
        </h1>

        <div className="flex items-center gap-2">
          {profile?.display_name && (
            <div className="text-right mr-1 hidden min-[400px]:block">
              <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[100px]">
                {profile.display_name}
              </p>
              {roleLabel && (
                <p className="text-[9px] text-accent font-medium uppercase tracking-wider">{roleLabel}</p>
              )}
            </div>
          )}
          <NotificationBell />
          <button
            onClick={signOut}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
