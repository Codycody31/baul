import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2, AlertCircle, FileText, FileCode, Image, Film, Music } from "lucide-react";
import { commands } from "@/lib/tauri";
import { formatBytes, getFileName } from "@/lib/utils";
import type { S3Object } from "@/types/object";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object: S3Object | null;
  connectionId: string;
  bucket: string;
  onDownload: (key: string) => void;
}

type PreviewType = "image" | "video" | "audio" | "text" | "code" | "pdf" | "unsupported";

function getPreviewType(object: S3Object): PreviewType {
  const contentType = object.contentType?.toLowerCase() || "";
  const key = object.key.toLowerCase();
  const ext = key.split(".").pop() || "";

  // Image types
  if (contentType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) {
    return "image";
  }

  // Video types
  if (contentType.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) {
    return "video";
  }

  // Audio types
  if (contentType.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) {
    return "audio";
  }

  // PDF
  if (contentType === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  // Code files
  const codeExtensions = [
    "js", "ts", "jsx", "tsx", "json", "html", "css", "scss", "sass", "less",
    "py", "rb", "rs", "go", "java", "c", "cpp", "h", "hpp", "cs",
    "php", "swift", "kt", "scala", "sh", "bash", "zsh", "fish",
    "yaml", "yml", "toml", "ini", "conf", "env", "dockerfile",
    "sql", "graphql", "xml", "vue", "svelte"
  ];
  if (codeExtensions.includes(ext)) {
    return "code";
  }

  // Plain text
  const textExtensions = ["txt", "md", "markdown", "rst", "log", "csv"];
  if (contentType.startsWith("text/") || textExtensions.includes(ext)) {
    return "text";
  }

  return "unsupported";
}

function getPreviewIcon(type: PreviewType) {
  switch (type) {
    case "image": return <Image className="h-5 w-5" />;
    case "video": return <Film className="h-5 w-5" />;
    case "audio": return <Music className="h-5 w-5" />;
    case "code": return <FileCode className="h-5 w-5" />;
    case "text":
    case "pdf":
    default:
      return <FileText className="h-5 w-5" />;
  }
}

export function PreviewDialog({
  open,
  onOpenChange,
  object,
  connectionId,
  bucket,
  onDownload,
}: PreviewDialogProps) {
  const [previewType, setPreviewType] = useState<PreviewType>("unsupported");

  useEffect(() => {
    if (object) {
      setPreviewType(getPreviewType(object));
    }
  }, [object]);

  const { data: presignedUrl, isLoading: urlLoading, error: urlError } = useQuery({
    queryKey: ["presigned-url", connectionId, bucket, object?.key],
    queryFn: () => commands.getPresignedUrl(connectionId, bucket, object!.key, 3600),
    enabled: open && !!object && ["image", "video", "audio", "pdf"].includes(previewType),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const { data: textContent, isLoading: textLoading, error: textError } = useQuery({
    queryKey: ["object-text", connectionId, bucket, object?.key],
    queryFn: () => commands.getObjectText(connectionId, bucket, object!.key, 1024 * 1024),
    enabled: open && !!object && ["text", "code"].includes(previewType),
  });

  const isLoading = urlLoading || textLoading;
  const error = urlError || textError;

  if (!object) return null;

  const fileName = getFileName(object.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              {getPreviewIcon(previewType)}
              <DialogTitle className="truncate">{fileName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {formatBytes(object.size)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(object.key)}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {presignedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(presignedUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{String(error)}</p>
            </div>
          )}

          {!isLoading && !error && previewType === "image" && presignedUrl && (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg overflow-hidden">
              <img
                src={presignedUrl}
                alt={fileName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          )}

          {!isLoading && !error && previewType === "video" && presignedUrl && (
            <div className="flex items-center justify-center h-full bg-black rounded-lg overflow-hidden">
              <video
                src={presignedUrl}
                controls
                className="max-w-full max-h-[60vh]"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!isLoading && !error && previewType === "audio" && presignedUrl && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-muted/30 rounded-lg">
              <Music className="h-16 w-16 text-muted-foreground" />
              <audio src={presignedUrl} controls className="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}

          {!isLoading && !error && previewType === "pdf" && presignedUrl && (
            <iframe
              src={presignedUrl}
              className="w-full h-[60vh] rounded-lg border"
              title={fileName}
            />
          )}

          {!isLoading && !error && (previewType === "text" || previewType === "code") && textContent && (
            <ScrollArea className="h-[60vh] rounded-lg border bg-muted/30">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                {textContent}
              </pre>
            </ScrollArea>
          )}

          {previewType === "unsupported" && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-muted/30 rounded-lg">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This file type cannot be previewed. Download to view.
                </p>
                {object.contentType && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Content-Type: {object.contentType}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
