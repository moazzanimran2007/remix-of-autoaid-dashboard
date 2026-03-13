import { Bell, LogOut } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Wordmark */}
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-foreground">Mech</span>
          <span className="text-primary">AI</span>
        </h1>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
