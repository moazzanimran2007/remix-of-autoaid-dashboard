import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface PhotoViewerProps {
  photos: string[];
}

export function PhotoViewer({ photos }: PhotoViewerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div className="card-social p-4">
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mb-1.5 opacity-30" />
          <p className="text-xs">No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-social p-4">
        <h3 className="font-semibold text-foreground mb-3">Photos</h3>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden border border-foreground/10 hover:border-primary transition-colors group"
            >
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg">
          {selectedPhoto && (
            <img src={selectedPhoto} alt="Full size" className="w-full h-auto rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
