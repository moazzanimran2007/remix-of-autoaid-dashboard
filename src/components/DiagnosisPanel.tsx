import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, AlertCircle, CheckCircle, XCircle, Info, ShieldAlert, TrendingUp, Package, ExternalLink } from "lucide-react";
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
  partsSearchResults?: Job['partsSearchResults'];
}

export function DiagnosisPanel({ diagnosis, severity, isAnalyzing = false, partsSearchResults }: DiagnosisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="card-social p-4">
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-3 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">AI is analyzing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="card-social p-4">
        <div className="flex items-center justify-center py-6">
          <p className="text-xs text-muted-foreground">No diagnosis available yet</p>
        </div>
      </div>
    );
  }

  const hasEnhancedData = diagnosis.rootCause || diagnosis.makeModelSpecifics;

  return (
    <div className="card-social p-4">
      {/* Header with purple accent for AI content */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="chip-pill border-accent/30 text-accent text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider">AI Diagnosis</span>
        </div>
        {diagnosis.confidenceLevel && (
          <span className="font-numbers text-xs font-semibold text-muted-foreground">
            {diagnosis.confidenceLevel}%
          </span>
        )}
      </div>

      {/* Report card with purple tint */}
      <div className="border border-accent/20 rounded-2xl bg-accent/5 p-3 mb-3">
        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card rounded-xl p-2.5 border border-foreground/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Issue</p>
            <p className="text-xs font-semibold text-foreground line-clamp-2">{diagnosis.issue}</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 border border-foreground/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Severity</p>
            <p className={`text-xs font-bold ${severity === 'high' ? 'text-destructive' : severity === 'medium' ? 'text-status-in-progress' : 'text-status-resolved'}`}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </p>
          </div>
          <div className="bg-card rounded-xl p-2.5 border border-foreground/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Est. Time</p>
            <p className="text-xs font-semibold font-numbers text-foreground">{diagnosis.estimatedTime}</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 border border-foreground/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Parts</p>
            <p className="text-xs font-semibold font-numbers text-status-resolved">
              {diagnosis.requiredParts?.length || 0} needed
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Safety Warnings */}
        {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              <h4 className="text-xs font-semibold text-destructive">Safety Warnings</h4>
            </div>
            <ul className="space-y-0.5 pl-5">
              {diagnosis.safetyWarnings.map((w, i) => (
                <li key={i} className="text-[11px] text-foreground list-disc">{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Vehicle-specific info */}
        {diagnosis.makeModelSpecifics && diagnosis.makeModelSpecifics !== "Vehicle-specific details unavailable" && (
          <div className="bg-accent/5 border border-accent/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <h4 className="text-xs font-semibold text-foreground">Vehicle-Specific</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">{diagnosis.makeModelSpecifics}</p>
          </div>
        )}

        {/* Tools */}
        {diagnosis.recommendedTools?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-foreground">Tools</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {diagnosis.recommendedTools.slice(0, 3).map((tool, i) => (
                <span key={i} className="chip-pill chip-inactive text-[10px] px-2 py-0.5">{tool}</span>
              ))}
              {diagnosis.recommendedTools.length > 3 && (
                <span className="chip-pill chip-inactive text-[10px] px-2 py-0.5">+{diagnosis.recommendedTools.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Accordion */}
        {hasEnhancedData && (
          <Accordion type="multiple" className="w-full">
            {diagnosis.rootCause && (
              <AccordionItem value="root-cause" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><Info className="h-3 w-3" />Root Cause</div></AccordionTrigger>
                <AccordionContent><p className="text-[11px] text-muted-foreground">{diagnosis.rootCause}</p></AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.diagnosticSteps && diagnosis.diagnosticSteps.length > 0 && (
              <AccordionItem value="steps" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3" />Steps ({diagnosis.diagnosticSteps.length})</div></AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-1">
                    {diagnosis.diagnosticSteps.map((step, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                        <span className="font-numbers font-semibold text-accent">{i + 1}.</span>{step}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.requiredParts && diagnosis.requiredParts.length > 0 && (
              <AccordionItem value="parts" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3 w-3" />Parts ({diagnosis.requiredParts.length})
                    {partsSearchResults && <span className="chip-pill border-primary/30 text-primary text-[8px] px-1.5 py-0 ml-1">Live</span>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {diagnosis.requiredParts.map((part, i) => {
                      const searchResult = partsSearchResults?.results?.find(r => r.partName === part.partName);
                      return (
                        <div key={i} className="border border-foreground/10 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold">{part.partName}</p>
                            <span className="chip-pill text-[8px] px-1.5 py-0 border-foreground/10">{part.isCommon ? 'Common' : 'Special'}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Est: {part.estimatedCost}</p>
                          {searchResult?.suppliers?.map((s, si) => (
                            <a key={si} href={s.purchaseLink} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-secondary rounded-lg mt-1.5 hover:bg-secondary/80 transition-colors">
                              <div>
                                <p className="text-[11px] font-medium">{s.supplierName}</p>
                                <p className="text-[9px] text-muted-foreground">{s.partNumber}</p>
                              </div>
                              <div className="text-right flex items-center gap-1">
                                <span className="font-numbers font-bold text-sm text-accent">${s.price.toFixed(2)}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </a>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.alternativeDiagnoses && diagnosis.alternativeDiagnoses.length > 0 && (
              <AccordionItem value="alts" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><XCircle className="h-3 w-3" />Alternatives ({diagnosis.alternativeDiagnoses.length})</div></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {diagnosis.alternativeDiagnoses.map((alt, i) => (
                      <div key={i} className="p-2 border border-foreground/10 rounded-xl">
                        <p className="text-xs font-medium">{alt.issue}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alt.distinguishingFactors}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.commonIssuesForModel && diagnosis.commonIssuesForModel.length > 0 && (
              <AccordionItem value="common" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" />Common Issues</div></AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-0.5">{diagnosis.commonIssuesForModel.map((issue, i) => <li key={i} className="text-[11px] text-muted-foreground list-disc ml-4">{issue}</li>)}</ul>
                </AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.preventiveMeasures && diagnosis.preventiveMeasures.length > 0 && (
              <AccordionItem value="prevent" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" />Preventive</div></AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-0.5">{diagnosis.preventiveMeasures.map((m, i) => <li key={i} className="text-[11px] text-muted-foreground list-disc ml-4">{m}</li>)}</ul>
                </AccordionContent>
              </AccordionItem>
            )}
            {diagnosis.mechanicNotes && (
              <AccordionItem value="notes" className="border-foreground/10">
                <AccordionTrigger className="text-xs py-2"><div className="flex items-center gap-1.5"><Info className="h-3 w-3" />Mechanic Notes</div></AccordionTrigger>
                <AccordionContent><p className="text-[11px] text-muted-foreground">{diagnosis.mechanicNotes}</p></AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
      </div>
    </div>
  );
}
