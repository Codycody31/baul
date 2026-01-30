import { Upload, Download, Check, X, Loader2, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Transfer } from "@/stores/transferStore";

interface TransferItemProps {
  transfer: Transfer;
  onRemove: () => void;
}

export function TransferItem({ transfer, onRemove }: TransferItemProps) {
  const Icon = transfer.type === "upload" ? Upload : Download;

  const statusIcon = () => {
    switch (transfer.status) {
      case "queued":
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "failed":
        return <X className="h-4 w-4 text-destructive" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border-b last:border-b-0",
        transfer.status === "failed" && "bg-destructive/5"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{transfer.fileName}</span>
          {statusIcon()}
        </div>

        {transfer.status === "in_progress" && (
          <div className="mt-1 space-y-1">
            <Progress value={transfer.progress} className="h-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(transfer.progress)}%</span>
              <span>
                {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.totalBytes)}
              </span>
            </div>
          </div>
        )}

        {transfer.status === "failed" && transfer.error && (
          <p className="text-xs text-destructive mt-1 truncate">{transfer.error}</p>
        )}

        {transfer.status === "completed" && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(transfer.totalBytes)} transferred
          </p>
        )}

        <p className="text-xs text-muted-foreground truncate">
          {transfer.bucket}/{transfer.key}
        </p>
      </div>

      {(transfer.status === "completed" || transfer.status === "failed") && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
