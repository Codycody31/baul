import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";

interface DeleteBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
}

export function DeleteBucketDialog({
  open,
  onOpenChange,
  bucketName,
}: DeleteBucketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeConnectionId, activeBucket, setActiveBucket } = useConnectionStore();

  const [confirmName, setConfirmName] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnectionId) throw new Error("No connection selected");
      await commands.deleteBucket(activeConnectionId, bucketName);
    },
    onSuccess: () => {
      toast({
        title: "Bucket deleted",
        description: `Bucket "${bucketName}" deleted successfully`,
      });
      // If we deleted the active bucket, clear it
      if (activeBucket === bucketName) {
        setActiveBucket(null);
      }
      queryClient.invalidateQueries({ queryKey: ["buckets", activeConnectionId] });
      onOpenChange(false);
      setConfirmName("");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete bucket",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== bucketName) return;
    deleteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setConfirmName("");
      onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Bucket
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The bucket must be empty before it can be deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-4 text-sm">
              <p>
                You are about to permanently delete the bucket{" "}
                <strong className="font-mono">{bucketName}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmName">
                Type <span className="font-mono font-bold">{bucketName}</span> to confirm
              </Label>
              <Input
                id="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={bucketName}
                autoComplete="off"
              />
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
              variant="destructive"
              disabled={confirmName !== bucketName || deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Bucket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
