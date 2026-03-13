import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic } from "lucide-react";

interface TranscriptLogProps {
  transcript: string;
  isLive?: boolean;
}

export function TranscriptLog({ transcript, isLive = false }: TranscriptLogProps) {
  return (
    <div className="card-social p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Call Transcript</h3>
        {isLive && (
          <div className="flex items-center gap-1.5 text-destructive">
            <Mic className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-xs font-medium">Live</span>
          </div>
        )}
      </div>

      <ScrollArea className="h-[200px] rounded-xl border border-foreground/10 bg-secondary/30 p-3">
        {transcript ? (
          <div className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
            {transcript}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">No transcript available</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
