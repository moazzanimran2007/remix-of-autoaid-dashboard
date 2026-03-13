import { Job } from "@/lib/api";

interface StatusTagProps {
  status: Job['status'];
}

const statusConfig = {
  new: { label: 'New', className: 'bg-accent text-accent-foreground' },
  assigned: { label: 'Assigned', className: 'bg-primary text-primary-foreground' },
  'in-progress': { label: 'In Progress', className: 'bg-status-in-progress text-accent-foreground' },
  resolved: { label: 'Resolved', className: 'bg-status-resolved text-accent-foreground' },
};

export function StatusTag({ status }: StatusTagProps) {
  const config = statusConfig[status];
  return (
    <span className={`chip-pill border-transparent text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
