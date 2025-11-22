import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, AlertCircle } from "lucide-react";
import { Job } from "@/lib/api";

interface DiagnosisPanelProps {
  diagnosis?: Job['diagnosis'];
  severity: Job['severity'];
  isAnalyzing?: boolean;
}

export function DiagnosisPanel({ diagnosis, severity, isAnalyzing = false }: DiagnosisPanelProps) {
  if (isAnalyzing) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">AI is analyzing the issue...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!diagnosis) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No diagnosis available yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg text-foreground mb-4">AI Diagnosis</h3>
      
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Probable Issue</h4>
          </div>
          <p className="text-foreground pl-7">{diagnosis.issue}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Recommended Tools</h4>
          </div>
          <div className="flex flex-wrap gap-2 pl-7">
            {diagnosis.recommendedTools.map((tool, index) => (
              <Badge key={index} variant="secondary">
                {tool}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Estimated Repair Time</h4>
          </div>
          <p className="text-foreground pl-7">{diagnosis.estimatedTime}</p>
        </div>
      </div>
    </Card>
  );
}
