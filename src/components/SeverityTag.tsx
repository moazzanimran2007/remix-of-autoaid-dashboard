import { Badge } from "@/components/ui/badge";
import { Job } from "@/lib/api";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface SeverityTagProps {
  severity: Job['severity'];
}

const severityConfig = {
  low: {
    label: 'Low',
    icon: Info,
    className: 'bg-severity-low text-white',
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    className: 'bg-severity-medium text-white',
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    className: 'bg-severity-high text-white',
  },
};

export function SeverityTag({ severity }: SeverityTagProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
