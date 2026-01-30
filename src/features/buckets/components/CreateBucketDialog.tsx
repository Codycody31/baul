import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
];

export function CreateBucketDialog({ open, onOpenChange }: CreateBucketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeConnectionId, connections } = useConnectionStore();

  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("default");

  const activeConnection = connections.find(c => c.id === activeConnectionId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnectionId) throw new Error("No connection selected");
      const selectedRegion = region === "default" ? undefined : region;
      await commands.createBucket(activeConnectionId, bucketName, selectedRegion);
    },
    onSuccess: () => {
      toast({
        title: "Bucket created",
        description: `Bucket "${bucketName}" created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["buckets", activeConnectionId] });
      onOpenChange(false);
      setBucketName("");
      setRegion("default");
    },
    onError: (error) => {
      toast({
        title: "Failed to create bucket",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim()) return;
    createMutation.mutate();
  };

  const isValidBucketName = (name: string) => {
    // Basic S3 bucket naming rules
    if (name.length < 3 || name.length > 63) return false;
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) return false;
    if (/\.\./.test(name)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return false;
    return true;
  };

  const bucketNameError = bucketName && !isValidBucketName(bucketName)
    ? "Bucket name must be 3-63 characters, lowercase, and follow S3 naming rules"
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bucket</DialogTitle>
          <DialogDescription>
            Create a new bucket in {activeConnection?.name || "the selected connection"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bucketName">Bucket Name</Label>
              <Input
                id="bucketName"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value.toLowerCase())}
                placeholder="my-bucket-name"
                autoComplete="off"
              />
              {bucketNameError && (
                <p className="text-sm text-destructive">{bucketNameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, hyphens, and periods only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region (optional)</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Use connection default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use connection default</SelectItem>
                  {COMMON_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to use the connection's default region.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!bucketName.trim() || !!bucketNameError || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Bucket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
