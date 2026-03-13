import { Job } from "@/lib/api";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface SeverityTagProps {
  severity: Job['severity'];
}

const severityConfig = {
  low: { label: 'Low', icon: Info, className: 'border-severity-low text-foreground' },
  medium: { label: 'Med', icon: AlertTriangle, className: 'border-severity-medium text-foreground' },
  high: { label: 'High', icon: AlertCircle, className: 'border-destructive text-destructive' },
};

export function SeverityTag({ severity }: SeverityTagProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  return (
    <span className={`chip-pill text-xs font-semibold flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
