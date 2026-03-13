import { MapPin } from "lucide-react";

interface MapComponentProps {
  location?: {
    lat: number;
    lng: number;
  };
}

export function MapComponent({ location }: MapComponentProps) {
  if (!location) {
    return (
      <div className="card-social p-4">
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <MapPin className="h-8 w-8 mb-1.5 opacity-30" />
          <p className="text-xs">No location available</p>
        </div>
      </div>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`;

  return (
    <div className="card-social p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground">Location</h3>
      </div>
      <div className="rounded-xl overflow-hidden border border-foreground/10">
        <iframe
          width="100%"
          height="200"
          frameBorder="0"
          scrolling="no"
          src={mapUrl}
          title="Customer location"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 font-numbers">
        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
      </p>
    </div>
  );
}
