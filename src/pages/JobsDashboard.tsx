import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Job } from "@/lib/api";
import { wsManager, WebSocketEvent } from "@/lib/websocket";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function JobsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

    return () => {
      unsubscribe();
    };
  }, [refetch]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.carModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.symptoms.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Jobs Dashboard</h1>
        <p className="text-muted-foreground">Monitor and manage all incoming customer requests</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, car model, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No jobs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
