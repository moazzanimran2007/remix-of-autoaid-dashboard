import { Card } from "@/components/ui/card";
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
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p>No photos available</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-5">
        <h3 className="font-semibold text-lg text-foreground mb-4">Customer Photos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors group"
            >
              <img
                src={photo}
                alt={`Customer photo ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      </Card>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
