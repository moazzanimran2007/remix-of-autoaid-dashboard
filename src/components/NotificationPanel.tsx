import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Briefcase, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: (typeof notifications)[0]) => {
    if (!n.read) markAsRead(n.id);
    if (n.job_id) navigate(`/jobs/${n.job_id}`);
  };

  const iconForType = (type: string) => {
    if (type === "job_created") return <Briefcase className="h-4 w-4 text-primary shrink-0" />;
    if (type === "job_updated") return <RefreshCw className="h-4 w-4 text-accent shrink-0" />;
    return <Bell className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-secondary/50 transition-colors border-b border-border/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5">{iconForType(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
