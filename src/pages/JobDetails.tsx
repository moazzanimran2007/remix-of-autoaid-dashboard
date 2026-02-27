import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Job } from "@/lib/api";
import { wsManager, WebSocketEvent } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusTag } from "@/components/StatusTag";
import { SeverityTag } from "@/components/SeverityTag";
import { TranscriptLog } from "@/components/TranscriptLog";
import { DiagnosisPanel } from "@/components/DiagnosisPanel";
import { PhotoViewer } from "@/components/PhotoViewer";
import { MapComponent } from "@/components/MapComponent";
import { ArrowLeft, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMechanic, setSelectedMechanic] = useState<string>("");

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id!),
    enabled: !!id,
  });

  const { data: mechanics = [] } = useQuery({
    queryKey: ['mechanics'],
    queryFn: api.getMechanics,
  });

  const assignMutation = useMutation({
    mutationFn: (mechanicId: string) => api.assignJob(id!, mechanicId),
    onSuccess: () => {
      toast.success('Mechanic assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: () => api.updateJobStatus(id!, 'resolved'),
    onSuccess: () => {
      toast.success('Job marked as completed');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
  });

  useEffect(() => {
    if (!id) return;

    const unsubscribe = wsManager.subscribe((event: WebSocketEvent) => {
      if (
        (event.type === 'transcript' && event.jobId === id) ||
        (event.type === 'photo_received' && event.jobId === id) ||
        (event.type === 'location_update' && event.jobId === id) ||
        (event.type === 'diagnosis_update' && event.jobId === id) ||
        (event.type === 'job_updated' && event.job.id === id)
      ) {
        queryClient.invalidateQueries({ queryKey: ['job', id] });
      }
    });

    return unsubscribe;
  }, [id, queryClient]);

  const handleCallCustomer = () => {
    if (job?.customerPhone) {
      window.open(`tel:${job.customerPhone}`);
      toast.success('Opening phone dialer...');
    }
  };

  const handleAssignMechanic = () => {
    if (selectedMechanic) {
      assignMutation.mutate(selectedMechanic);
    }
  };

  if (isLoading || !job) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Job #{job.id.slice(0, 8)}
            </h1>
            <div className="flex gap-2">
              <SeverityTag severity={job.severity} />
              <StatusTag status={job.status} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCallCustomer} variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
            {job.status !== 'resolved' && (
              <Button
                onClick={() => completeJobMutation.mutate()}
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completed
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="text-foreground font-medium">{job.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="text-foreground font-medium">{job.customerPhone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vehicle</p>
                <p className="text-foreground font-medium">
                  {job.carYear} {job.carMake} {job.carModel}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reported</p>
                <p className="text-foreground font-medium">
                  {new Date(job.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Symptoms</p>
              <p className="text-foreground">{job.symptoms}</p>
            </div>
          </Card>

          <TranscriptLog transcript={job.transcript || ''} />

          <DiagnosisPanel
            diagnosis={job.diagnosis}
            severity={job.severity}
            isAnalyzing={!job.diagnosis}
            partsSearchResults={job.partsSearchResults}
          />

          <PhotoViewer photos={job.photos || []} />
        </div>

        <div className="space-y-6">
          <MapComponent location={job.location} />

          <Card className="p-6">
            <h3 className="font-semibold text-lg text-foreground mb-4">Assign Mechanic</h3>
            {job.assignedMechanic ? (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Assigned to</p>
                <p className="text-foreground font-medium">{job.assignedMechanic}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mechanic" />
                  </SelectTrigger>
                  <SelectContent>
                    {mechanics.map((mechanic) => (
                      <SelectItem key={mechanic.id} value={mechanic.id}>
                        {mechanic.name} - {mechanic.distance}km away
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignMechanic}
                  disabled={!selectedMechanic || assignMutation.isPending}
                  className="w-full"
                >
                  Assign Mechanic
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
