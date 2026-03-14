import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ThumbsUp, BookOpen, Clock, Wrench } from "lucide-react";
import { toast } from "sonner";

export function KnowledgeBasePanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['knowledge-base', makeFilter, modelFilter, search],
    queryFn: () => api.getKnowledgeBase({
      make: makeFilter || undefined,
      model: modelFilter || undefined,
      search: search || undefined,
    }),
  });

  const upvoteMutation = useMutation({
    mutationFn: (id: string) => api.upvoteKnowledgeBase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Upvoted!');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Knowledge Base</h2>
      </div>
      <p className="text-xs text-muted-foreground">Verified diagnoses from your team — used to improve AI accuracy.</p>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search symptoms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-foreground/15 h-9 text-sm"
          />
        </div>
        <Input
          placeholder="Make"
          value={makeFilter}
          onChange={e => setMakeFilter(e.target.value)}
          className="w-24 rounded-xl border-foreground/15 h-9 text-sm"
        />
        <Input
          placeholder="Model"
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          className="w-24 rounded-xl border-foreground/15 h-9 text-sm"
        />
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No entries yet</p>
          <p className="text-xs mt-1">Verify diagnoses from job details to build your knowledge base</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <div key={entry.id} className="card-social p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="chip-pill border-accent/30 text-accent text-[10px] px-2 py-0.5 font-semibold">
                    {entry.car_year ? `${entry.car_year} ` : ''}{entry.car_make} {entry.car_model}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => upvoteMutation.mutate(entry.id)}
                  className="h-7 px-2 gap-1 text-muted-foreground hover:text-accent"
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span className="font-numbers text-xs">{entry.upvotes || 0}</span>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mb-1">{entry.symptom_keywords}</p>
              <p className="text-sm font-medium text-foreground mb-2">{entry.verified_diagnosis}</p>

              {entry.fix_description && (
                <div className="flex items-start gap-1.5 mb-1">
                  <Wrench className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{entry.fix_description}</p>
                </div>
              )}

              {entry.actual_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-numbers">{entry.actual_time}</p>
                </div>
              )}

              {entry.severity && (
                <span className={`chip-pill text-[10px] px-2 py-0.5 mt-2 inline-block ${
                  entry.severity === 'high' ? 'border-destructive/30 text-destructive' :
                  entry.severity === 'medium' ? 'border-status-in-progress/30 text-status-in-progress' :
                  'border-status-resolved/30 text-status-resolved'
                }`}>
                  {entry.severity}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
