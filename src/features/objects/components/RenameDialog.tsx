import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { getFileName } from "@/lib/utils";
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

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectKey: string;
}

export function RenameDialog({ open, onOpenChange, objectKey }: RenameDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeConnectionId, activeBucket, currentPath } = useConnectionStore();

  const currentName = getFileName(objectKey);
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    if (open) {
      setNewName(currentName);
    }
  }, [open, currentName]);

  const renameMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnectionId || !activeBucket) {
        throw new Error("No connection or bucket selected");
      }

      // Construct the new key by replacing the filename
      const prefix = objectKey.substring(0, objectKey.lastIndexOf("/") + 1);
      const newKey = prefix + newName;

      if (newKey === objectKey) {
        throw new Error("New name is the same as the current name");
      }

      await commands.renameObject(activeConnectionId, activeBucket, objectKey, newKey);
    },
    onSuccess: () => {
      toast({
        title: "Object renamed",
        description: `Renamed to "${newName}"`,
      });
      queryClient.invalidateQueries({
        queryKey: ["objects", activeConnectionId, activeBucket, currentPath],
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to rename",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === currentName) return;
    renameMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Object</DialogTitle>
          <DialogDescription>
            Enter a new name for "{currentName}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">New Name</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                autoComplete="off"
                autoFocus
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
              disabled={!newName.trim() || newName === currentName || renameMutation.isPending}
            >
              {renameMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
