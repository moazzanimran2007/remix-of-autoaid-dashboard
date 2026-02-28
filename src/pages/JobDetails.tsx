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
import { ArrowLeft, Phone, CheckCircle, ShieldAlert, Upload, Camera, Loader2 } from "lucide-react";
import { useRef } from "react";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingPhoto(true);
    try {
      const vehicleContext = job ? `${job.carYear} ${job.carMake} ${job.carModel}` : undefined;
      const imageUrl = await api.uploadPhoto(id, file);
      toast.success('Photo uploaded — analyzing with Reka Vision...');
      await api.analyzePhoto(id, imageUrl, vehicleContext);
      toast.success('Visual inspection complete');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    } catch (err) {
      toast.error('Failed to analyze photo');
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

      {job.toxicityFlag && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Modulate: Toxic Content Detected</p>
            {job.toxicityReason && (
              <p className="text-sm mt-0.5">Reason: {job.toxicityReason}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              This call was flagged by Modulate's voice safety analysis. Review the transcript before assigning a mechanic.
            </p>
          </div>
        </div>
      )}

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

          {/* Reka Vision Photo Analysis */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Visual Inspection</h2>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingPhoto ? 'Analyzing...' : 'Upload Photo'}
                </Button>
              </div>
            </div>

            {(!job.photoAnalysis || job.photoAnalysis.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Upload a photo of the vehicle issue</p>
                <p className="text-xs mt-1">Reka Vision will analyze it automatically</p>
              </div>
            ) : (
              <div className="space-y-6">
                {job.photoAnalysis.map((entry, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={entry.imageUrl}
                        alt={`Inspection photo ${i + 1}`}
                        className="w-32 h-24 object-cover rounded-lg border flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Reka Vision
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.analyzedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {entry.analysis}
                        </p>
                      </div>
                    </div>
                    {i < job.photoAnalysis!.length - 1 && <hr className="border-border" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
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
