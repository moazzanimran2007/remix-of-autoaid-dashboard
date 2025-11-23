import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, AlertCircle, CheckCircle, XCircle, Info, ShieldAlert, TrendingUp, Package } from "lucide-react";
import { Job } from "@/lib/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const hasEnhancedData = diagnosis.rootCause || diagnosis.makeModelSpecifics;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-foreground">AI Diagnosis</h3>
        {diagnosis.confidenceLevel && (
          <Badge variant={diagnosis.confidenceLevel >= 80 ? "default" : "secondary"}>
            {diagnosis.confidenceLevel}% confidence
          </Badge>
        )}
      </div>
      
      <div className="space-y-5">
        {/* Safety Warnings - Most Prominent */}
        {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <h4 className="font-medium text-destructive">Safety Warnings</h4>
            </div>
            <ul className="space-y-1 pl-7">
              {diagnosis.safetyWarnings.map((warning, index) => (
                <li key={index} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Issue */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-foreground">Probable Issue</h4>
          </div>
          <p className="text-foreground pl-7">{diagnosis.issue}</p>
        </div>

        {/* Make/Model Specifics - Highlighted */}
        {diagnosis.makeModelSpecifics && diagnosis.makeModelSpecifics !== "Vehicle-specific details unavailable" && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-foreground">Vehicle-Specific Information</h4>
            </div>
            <p className="text-sm text-foreground pl-7">{diagnosis.makeModelSpecifics}</p>
          </div>
        )}

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-foreground">Estimated Time</h4>
            </div>
            <p className="text-foreground pl-7">{diagnosis.estimatedTime}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-foreground">Required Tools</h4>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
              {diagnosis.recommendedTools?.slice(0, 3).map((tool, index) => (
                <Badge key={index} variant="secondary">
                  {tool}
                </Badge>
              ))}
              {diagnosis.recommendedTools?.length > 3 && (
                <Badge variant="outline">+{diagnosis.recommendedTools.length - 3} more</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Details - Collapsible Sections */}
        {hasEnhancedData && (
          <Accordion type="multiple" className="w-full">
            {/* Root Cause Analysis */}
            {diagnosis.rootCause && (
              <AccordionItem value="root-cause">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Root Cause Analysis</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{diagnosis.rootCause}</p>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Diagnostic Steps */}
            {diagnosis.diagnosticSteps && diagnosis.diagnosticSteps.length > 0 && (
              <AccordionItem value="diagnostic-steps">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Diagnostic Procedure ({diagnosis.diagnosticSteps.length} steps)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-2">
                    {diagnosis.diagnosticSteps.map((step, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex gap-3">
                        <span className="font-semibold text-primary min-w-[24px]">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Required Parts */}
            {diagnosis.requiredParts && diagnosis.requiredParts.length > 0 && (
              <AccordionItem value="parts">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Required Parts ({diagnosis.requiredParts.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {diagnosis.requiredParts.map((part, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{part.partName}</p>
                          <p className="text-xs text-muted-foreground">{part.estimatedCost}</p>
                        </div>
                        {part.isCommon ? (
                          <Badge variant="secondary" className="text-xs">Common</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Special Order</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Alternative Diagnoses */}
            {diagnosis.alternativeDiagnoses && diagnosis.alternativeDiagnoses.length > 0 && (
              <AccordionItem value="alternatives">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span>Alternative Diagnoses ({diagnosis.alternativeDiagnoses.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {diagnosis.alternativeDiagnoses.map((alt, index) => (
                      <div key={index} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{alt.issue}</p>
                          <Badge 
                            variant={alt.probability === 'high' ? 'destructive' : alt.probability === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {alt.probability} probability
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alt.distinguishingFactors}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Common Issues for Model */}
            {diagnosis.commonIssuesForModel && diagnosis.commonIssuesForModel.length > 0 && (
              <AccordionItem value="common-issues">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Common Issues for This Model</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1">
                    {diagnosis.commonIssuesForModel.map((issue, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Preventive Measures */}
            {diagnosis.preventiveMeasures && diagnosis.preventiveMeasures.length > 0 && (
              <AccordionItem value="preventive">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Preventive Measures</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1">
                    {diagnosis.preventiveMeasures.map((measure, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Mechanic Notes */}
            {diagnosis.mechanicNotes && (
              <AccordionItem value="mechanic-notes">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Mechanic Notes</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{diagnosis.mechanicNotes}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        {/* All Tools List - Only show if there are more than shown above */}
        {diagnosis.recommendedTools && diagnosis.recommendedTools.length > 3 && hasEnhancedData && (
          <div>
            <h4 className="font-medium text-foreground mb-2">All Required Tools</h4>
            <div className="flex flex-wrap gap-2">
              {diagnosis.recommendedTools.map((tool, index) => (
                <Badge key={index} variant="secondary">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
