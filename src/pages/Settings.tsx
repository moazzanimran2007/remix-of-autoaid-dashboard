import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-4">Preferences</p>

      <div className="space-y-4">
        <div className="card-social p-4">
          <h2 className="font-semibold text-foreground mb-3">Backend</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="api-url" className="text-xs">API Base URL</Label>
              <Input
                id="api-url"
                defaultValue={import.meta.env.VITE_API_BASE_URL || ''}
                placeholder="https://your-backend.com"
                className="mt-1 rounded-xl border-foreground/15 h-10"
              />
            </div>
            <div>
              <Label htmlFor="ws-url" className="text-xs">WebSocket URL</Label>
              <Input
                id="ws-url"
                defaultValue={import.meta.env.VITE_WS_URL || ''}
                placeholder="wss://your-backend.com/realtime"
                className="mt-1 rounded-xl border-foreground/15 h-10"
              />
            </div>
          </div>
        </div>

        <div className="card-social p-4">
          <h2 className="font-semibold text-foreground mb-3">Notifications</h2>
          <div className="space-y-4">
            {[
              { label: "New Job Alerts", desc: "Get notified when new jobs arrive" },
              { label: "Status Updates", desc: "Receive updates when job status changes" },
              { label: "Photo Uploads", desc: "Alert when customers upload photos" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full rounded-xl bg-primary text-primary-foreground h-11 font-semibold">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
