import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { stat } from "@tauri-apps/plugin-fs";
import { Loader2, Upload, File } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useTransferStore } from "@/stores/transferStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeConnectionId, activeBucket, currentPath } = useConnectionStore();
  const { addTransfer, updateTransfer } = useTransferStore();

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFiles = async () => {
    const files = await openFileDialog({
      multiple: true,
      directory: false,
    });

    if (files) {
      setSelectedFiles(Array.isArray(files) ? files : [files]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !activeConnectionId || !activeBucket) return;

    setIsUploading(true);
    handleClose();

    let successCount = 0;
    let failCount = 0;

    for (const filePath of selectedFiles) {
      const fileName = filePath.split("/").pop() || filePath.split("\\").pop() || "file";
      const key = currentPath + fileName;

      // Get file size for progress tracking
      let totalBytes = 0;
      try {
        const fileInfo = await stat(filePath);
        totalBytes = fileInfo.size;
      } catch {
        totalBytes = 0;
      }

      // Add to transfer queue
      const transferId = addTransfer({
        type: "upload",
        fileName,
        bucket: activeBucket,
        key,
        totalBytes,
      });

      // Update status to in_progress
      updateTransfer(transferId, {
        status: "in_progress",
        startedAt: Date.now(),
      });

      try {
        await commands.uploadFile(
          activeConnectionId,
          activeBucket,
          key,
          filePath
        );

        updateTransfer(transferId, {
          status: "completed",
          progress: 100,
          bytesTransferred: totalBytes,
          completedAt: Date.now(),
        });
        successCount++;
      } catch (error) {
        updateTransfer(transferId, {
          status: "failed",
          error: String(error),
          completedAt: Date.now(),
        });
        failCount++;
      }
    }

    // Refresh file list
    queryClient.invalidateQueries({
      queryKey: ["objects", activeConnectionId, activeBucket],
    });

    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
      });
    } else if (failCount > 0) {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${failCount} file(s)`,
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Select files to upload to {currentPath || "root"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            variant="outline"
            className="w-full h-24 border-dashed"
            onClick={handleSelectFiles}
            disabled={isUploading}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to select files
              </span>
            </div>
          </Button>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Selected files ({selectedFiles.length})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <File className="h-4 w-4" />
                    <span className="truncate">
                      {file.split("/").pop() || file.split("\\").pop()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
