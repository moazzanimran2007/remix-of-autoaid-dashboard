import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Job } from "@/lib/api";
import { wsManager, WebSocketEvent } from "@/lib/websocket";
import { JobCard } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

const FILTERS = ["All", "Jobs", "Diagnostics", "Mechanics", "Results"] as const;

function mapFilterToStatus(filter: string): string | null {
  if (filter === "All") return null;
  if (filter === "Jobs") return "new";
  if (filter === "Diagnostics") return "assigned";
  if (filter === "Mechanics") return "in-progress";
  if (filter === "Results") return "resolved";
  return null;
}

export default function JobsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.getJobs,
  });

  useEffect(() => {
    wsManager.connect();
    const unsubscribe = wsManager.subscribe((event: WebSocketEvent) => {
      if (event.type === 'job_created') {
        toast.success('New job received!');
        refetch();
      } else if (event.type === 'job_updated') {
        refetch();
      }
    });
    return () => { unsubscribe(); };
  }, [refetch]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.carModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.symptoms.toLowerCase().includes(searchQuery.toLowerCase());
    const status = mapFilterToStatus(activeFilter);
    const matchesStatus = !status || job.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="px-4 pt-4">
      {/* Filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`chip-pill whitespace-nowrap ${
              activeFilter === f ? "chip-active" : "chip-inactive"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-foreground/15 rounded-xl h-11"
        />
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 bg-secondary animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
