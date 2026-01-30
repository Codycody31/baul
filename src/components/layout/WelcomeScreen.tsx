import { Cloud, Database, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connectionStore";

export function WelcomeScreen() {
  const { activeConnectionId, connections } = useConnectionStore();

  if (!activeConnectionId && connections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome to Baul
            </h2>
            <p className="text-muted-foreground">
              Your modern S3-compatible storage browser. Connect to AWS S3,
              MinIO, Cloudflare R2, DigitalOcean Spaces, and more.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Connection
          </Button>
        </div>
      </div>
    );
  }

  if (activeConnectionId && !useConnectionStore.getState().activeBucket) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Select a Bucket
            </h2>
            <p className="text-muted-foreground">
              Enter a bucket name in the sidebar to start browsing your files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderOpen className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Select a Connection
          </h2>
          <p className="text-muted-foreground">
            Choose a connection from the sidebar to start browsing.
          </p>
        </div>
      </div>
    </div>
  );
}
