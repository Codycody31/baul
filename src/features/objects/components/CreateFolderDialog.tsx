import { useState } from "react";
import { Loader2, FolderPlus } from "lucide-react";
import { useObjects } from "../hooks/useObjects";
import { useConnectionStore } from "@/stores/connectionStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
}: CreateFolderDialogProps) {
  const { toast } = useToast();
  const { currentPath } = useConnectionStore();
  const { createFolder, isCreatingFolder } = useObjects();

  const [folderName, setFolderName] = useState("");

  const handleCreate = () => {
    if (!folderName.trim()) return;

    const fullPath = currentPath + folderName.trim();

    createFolder(fullPath, {
      onSuccess: () => {
        toast({
          title: "Folder created",
          description: `Successfully created folder "${folderName}"`,
        });
        handleClose();
      },
      onError: (error) => {
        toast({
          title: "Failed to create folder",
          description: String(error),
          variant: "destructive",
        });
      },
    });
  };

  const handleClose = () => {
    setFolderName("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && folderName.trim()) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder in {currentPath || "root"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              placeholder="my-folder"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreatingFolder}
          >
            {isCreatingFolder && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
