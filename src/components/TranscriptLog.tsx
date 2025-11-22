import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic } from "lucide-react";

interface TranscriptLogProps {
  transcript: string;
  isLive?: boolean;
}

export function TranscriptLog({ transcript, isLive = false }: TranscriptLogProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-foreground">Call Transcript</h3>
        {isLive && (
          <div className="flex items-center gap-2 text-destructive">
            <Mic className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Live</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[300px] rounded-md border bg-muted/30 p-4">
        {transcript ? (
          <div className="whitespace-pre-wrap text-sm text-foreground">
            {transcript}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No transcript available</p>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
