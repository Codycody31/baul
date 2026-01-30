import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useObjects } from "../hooks/useObjects";
import { useUIStore } from "@/stores/uiStore";
import { getFileName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDialog({ open, onOpenChange }: DeleteDialogProps) {
  const { toast } = useToast();
  const { selectedObjects, clearSelection } = useUIStore();
  const { deleteObjects, isDeleting } = useObjects();

  const handleDelete = () => {
    deleteObjects(selectedObjects, {
      onSuccess: () => {
        toast({
          title: "Deleted",
          description: `Successfully deleted ${selectedObjects.length} object(s)`,
        });
        clearSelection();
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: "Failed to delete",
          description: String(error),
          variant: "destructive",
        });
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Objects
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedObjects.length} object(s)?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>This will permanently delete the selected objects.</span>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Objects to delete:</p>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-1">
                {selectedObjects.map((key) => (
                  <div
                    key={key}
                    className="text-sm text-muted-foreground truncate"
                  >
                    {getFileName(key)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
