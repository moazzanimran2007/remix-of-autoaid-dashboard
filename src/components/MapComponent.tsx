import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

interface MapComponentProps {
  location?: {
    lat: number;
    lng: number;
  };
}

export function MapComponent({ location }: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Silently fail — user denied or unavailable
        }
      );
    }
  }, []);

  const center = location || userLocation;

  if (!center) {
    return (
      <div className="card-social p-4">
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <MapPin className="h-8 w-8 mb-1.5 opacity-30" />
          <p className="text-xs">No location available</p>
          <p className="text-[10px] mt-0.5">Enable location access to see the map</p>
        </div>
      </div>
    );
  }

  // Build markers
  let markers = `&marker=${center.lat},${center.lng}`;
  
  // If we have both customer and user locations, show a wider bounding box
  let bbox: string;
  if (location && userLocation && (location.lat !== userLocation.lat || location.lng !== userLocation.lng)) {
    const minLat = Math.min(location.lat, userLocation.lat) - 0.005;
    const maxLat = Math.max(location.lat, userLocation.lat) + 0.005;
    const minLng = Math.min(location.lng, userLocation.lng) - 0.005;
    const maxLng = Math.max(location.lng, userLocation.lng) + 0.005;
    bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  } else {
    bbox = `${center.lng - 0.01},${center.lat - 0.01},${center.lng + 0.01},${center.lat + 0.01}`;
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;

  return (
    <div className="card-social p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">
            {location ? "Customer Location" : "Your Location"}
          </h3>
        </div>
        {userLocation && location && (
          <span className="chip-pill chip-inactive text-[9px] px-2 py-0.5">
            📍 You're nearby
          </span>
        )}
      </div>
      <div className="rounded-xl overflow-hidden border border-foreground/10">
        <iframe
          width="100%"
          height="220"
          frameBorder="0"
          scrolling="no"
          src={mapUrl}
          title="Location map"
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {location && (
          <p className="text-[10px] text-muted-foreground font-numbers">
            Customer: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        )}
        {userLocation && (
          <p className="text-[10px] text-accent font-numbers">
            You: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}
