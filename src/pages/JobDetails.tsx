import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Job } from "@/lib/api";
import { wsManager, WebSocketEvent } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/StatusTag";
import { SeverityTag } from "@/components/SeverityTag";
import { TranscriptLog } from "@/components/TranscriptLog";
import { DiagnosisPanel } from "@/components/DiagnosisPanel";
import { PhotoViewer } from "@/components/PhotoViewer";
import { MapComponent } from "@/components/MapComponent";
import { ArrowLeft, Phone, CheckCircle, ShieldAlert, Upload, Camera, Loader2, Car } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
    onError: (err: Error) => toast.error(`Failed to assign mechanic: ${err.message}`),
  });

  const completeJobMutation = useMutation({
    mutationFn: () => api.updateJobStatus(id!, 'resolved'),
    onSuccess: () => {
      toast.success('Job marked as completed');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (err: Error) => toast.error(`Failed to update job: ${err.message}`),
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
      // Photo is now saved to the DB — refresh so it appears in the gallery immediately
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      toast.success('Photo uploaded — analyzing with AI Vision...');
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
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded-xl w-1/3" />
          <div className="h-48 bg-secondary rounded-2xl" />
          <div className="h-48 bg-secondary rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Toxicity warning */}
      {job.toxicityFlag && (
        <div className="card-social mb-4 p-3 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-xs">Toxic Content Detected</p>
              {job.toxicityReason && <p className="text-xs mt-0.5">{job.toxicityReason}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="card-social p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {job.customerName}
            </h1>
            <p className="text-sm text-muted-foreground">{job.customerPhone}</p>
          </div>
          <div className="flex gap-1.5">
            <SeverityTag severity={job.severity} />
            <StatusTag status={job.status} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <Car className="h-4 w-4" />
          <span>{job.carYear} {job.carMake} {job.carModel}</span>
        </div>

        <p className="text-sm text-foreground mb-4">{job.symptoms}</p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleCallCustomer}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-foreground/15"
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Call
          </Button>
          {job.status !== 'resolved' && (
            <Button
              onClick={() => completeJobMutation.mutate()}
              size="sm"
              className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        <TranscriptLog transcript={job.transcript || ''} />

        <DiagnosisPanel
          diagnosis={job.diagnosis}
          severity={job.severity}
          isAnalyzing={!job.diagnosis}
          partsSearchResults={job.partsSearchResults}
          job={job}
        />

        <PhotoViewer photos={job.photos || []} />

        {/* Visual Inspection */}
        <div className="card-social p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-accent" />
              <h2 className="font-semibold text-foreground">Visual Inspection</h2>
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
                className="rounded-xl border-foreground/15 text-xs"
              >
                {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                {uploadingPhoto ? 'Analyzing...' : 'Upload'}
              </Button>
            </div>
          </div>

          {(!job.photoAnalysis || job.photoAnalysis.length === 0) && !uploadingPhoto ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-foreground/15 rounded-xl">
              <Camera className="h-8 w-8 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">Upload a photo for AI analysis</p>
            </div>
          ) : (
            <div className="space-y-4">
              {job.photoAnalysis?.map((entry, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <img src={entry.imageUrl} alt={`Photo ${i + 1}`} className="w-20 h-16 object-cover rounded-xl border border-foreground/10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="chip-pill border-accent/30 text-accent text-[10px] px-2 py-0.5 mb-1 inline-block">AI Vision</span>
                      <p className="text-xs text-foreground leading-relaxed">{entry.analysis}</p>
                    </div>
                  </div>
                  {i < job.photoAnalysis!.length - 1 && <hr className="border-foreground/5" />}
                </div>
              ))}
              {uploadingPhoto && (
                <div className="flex items-start gap-3">
                  <Skeleton className="w-20 h-16 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="chip-pill border-accent/30 text-accent text-[10px] px-2 py-0.5 inline-block opacity-50">AI Vision</span>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <MapComponent location={job.location} />

        {/* Assign Mechanic */}
        <div className="card-social p-4">
          <h3 className="font-semibold text-foreground mb-3">Assign Mechanic</h3>
          {job.assignedMechanic ? (
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="text-sm font-medium text-foreground">{job.assignedMechanic}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                <SelectTrigger className="rounded-xl border-foreground/15">
                  <SelectValue placeholder="Select a mechanic" />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.distance}km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignMechanic}
                disabled={!selectedMechanic || assignMutation.isPending}
                className="w-full rounded-xl bg-primary text-primary-foreground"
              >
                Assign
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
