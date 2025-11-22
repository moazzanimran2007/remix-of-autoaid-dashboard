import { Card } from "@/components/ui/card";
import { Job } from "@/lib/api";
import { StatusTag } from "@/components/StatusTag";
import { SeverityTag } from "@/components/SeverityTag";
import { Clock, Car } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <Card className="p-5 hover:shadow-lg transition-all duration-200 border-l-4 hover:scale-[1.01]" 
            style={{ 
              borderLeftColor: job.severity === 'high' ? 'hsl(var(--severity-high))' : 
                               job.severity === 'medium' ? 'hsl(var(--severity-medium))' : 
                               'hsl(var(--severity-low))' 
            }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground">{job.customerName}</h3>
            <p className="text-sm text-muted-foreground">{job.customerPhone}</p>
          </div>
          <div className="flex gap-2">
            <SeverityTag severity={job.severity} />
            <StatusTag status={job.status} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Car className="h-4 w-4" />
          <span>{job.carModel}</span>
        </div>

        <p className="text-foreground mb-3 line-clamp-2">{job.symptoms}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
        </div>
      </Card>
    </Link>
  );
}
