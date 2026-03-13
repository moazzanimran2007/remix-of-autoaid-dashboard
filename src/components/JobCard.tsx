import { Job } from "@/lib/api";
import { StatusTag } from "@/components/StatusTag";
import { SeverityTag } from "@/components/SeverityTag";
import { Clock, Car, Zap, Heart, MessageCircle, Share2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getGrade(severity: Job['severity']) {
  if (severity === 'low') return 'A';
  if (severity === 'medium') return 'B';
  return 'C';
}

export function JobCard({ job }: JobCardProps) {
  return (
    <div className="card-social p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          <Zap className="h-3.5 w-3.5" />
          {job.diagnosis ? 'AI Diagnosed' : 'New Job'}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* User row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground shrink-0">
          {getInitials(job.customerName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{job.customerName}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{job.symptoms || 'No symptoms reported'}</p>
        </div>
      </div>

      {/* Nested bet-style card */}
      <Link to={`/jobs/${job.id}`} className="block">
        <div className="border-[1.5px] border-foreground/15 rounded-2xl p-3 hover:bg-secondary/50 transition-colors">
          {/* Vehicle + grade */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Car className="h-3.5 w-3.5" />
              <span className="truncate">
                {[job.carYear, job.carMake, job.carModel].filter(Boolean).join(' ') || 'Vehicle pending'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-numbers font-bold text-sm text-primary-foreground">
                {getGrade(job.severity)}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-2">
            <SeverityTag severity={job.severity} />
            <StatusTag status={job.status} />
          </div>

          {/* Confidence bar mock — shows severity visually */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-numbers text-muted-foreground">AI</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: job.diagnosis?.confidenceLevel
                    ? `${job.diagnosis.confidenceLevel}%`
                    : job.severity === 'low' ? '85%' : job.severity === 'medium' ? '60%' : '35%'
                }}
              />
            </div>
            <span className="text-xs font-numbers text-muted-foreground">
              {job.diagnosis?.confidenceLevel
                ? `${job.diagnosis.confidenceLevel}%`
                : job.severity === 'low' ? '85%' : job.severity === 'medium' ? '60%' : '35%'}
            </span>
          </div>

          {job.toxicityFlag && (
            <div className="flex items-center gap-1.5 text-destructive text-xs font-medium mt-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Flagged Call
            </div>
          )}
        </div>
      </Link>

      {/* Post footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-foreground/5">
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
          <Heart className="h-3.5 w-3.5" />
          <span className="font-numbers">0</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="font-numbers">0</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-numbers">{formatDistanceToNow(new Date(job.createdAt))}</span>
        </div>
      </div>
    </div>
  );
}
