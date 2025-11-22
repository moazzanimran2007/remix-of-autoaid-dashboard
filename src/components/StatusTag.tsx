import { Badge } from "@/components/ui/badge";
import { Job } from "@/lib/api";

interface StatusTagProps {
  status: Job['status'];
}

const statusConfig = {
  new: {
    label: 'New',
    className: 'bg-status-new text-white',
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-status-assigned text-white',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-status-in-progress text-white',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-status-resolved text-white',
  },
};

export function StatusTag({ status }: StatusTagProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
