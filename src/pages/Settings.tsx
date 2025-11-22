import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your application preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Backend Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-url">API Base URL</Label>
              <Input
                id="api-url"
                defaultValue={import.meta.env.VITE_API_BASE_URL || ''}
                placeholder="https://your-backend.com"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="ws-url">WebSocket URL</Label>
              <Input
                id="ws-url"
                defaultValue={import.meta.env.VITE_WS_URL || ''}
                placeholder="wss://your-backend.com/realtime"
                className="mt-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>New Job Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new jobs arrive
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Status Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates when job status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Photo Uploads</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when customers upload photos
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
