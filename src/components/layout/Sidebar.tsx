import { NavLink } from "@/components/NavLink";
import { ClipboardList, Users, Settings, Wrench, MessageSquare } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Wrench className="h-7 w-7 text-sidebar-primary" />
          <h1 className="text-xl font-bold text-sidebar-foreground">MechAI</h1>
        </div>
        <p className="text-sm text-sidebar-foreground/60 mt-1">Shop Assistant</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <NavLink
              to="/"
              end
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <ClipboardList className="h-5 w-5" />
              Jobs Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/mechanics"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <Users className="h-5 w-5" />
              Mechanics
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/chat"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <MessageSquare className="h-5 w-5" />
              AI Chat
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="px-4 py-3 bg-sidebar-accent rounded-lg">
          <p className="text-xs text-sidebar-foreground/60">Connected</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-sidebar-foreground font-medium">Live Updates</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
