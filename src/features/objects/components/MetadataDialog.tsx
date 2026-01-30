import { useQuery } from "@tanstack/react-query";
import { Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { commands } from "@/lib/tauri";
import { formatBytes, formatDate } from "@/lib/utils";
import type { S3Object } from "@/types/object";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCopyToClipboard } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/components/ui/use-toast";

interface MetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object: S3Object | null;
  connectionId: string;
  bucket: string;
}

interface MetadataRowProps {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}

function MetadataRow({ label, value, copyable }: MetadataRowProps) {
  const copyToClipboard = useCopyToClipboard();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex justify-between items-start py-2 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono text-right break-all">{value}</span>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function MetadataDialog({
  open,
  onOpenChange,
  object,
  connectionId,
  bucket,
}: MetadataDialogProps) {
  const { data: metadata, isLoading } = useQuery({
    queryKey: ["object-metadata", connectionId, bucket, object?.key],
    queryFn: () => commands.getObjectMetadata(connectionId, bucket, object!.key),
    enabled: open && !!object?.key && !!connectionId && !!bucket,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Object Metadata</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">
            {object?.key}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : metadata ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Basic Information</h4>
                <div className="divide-y">
                  <MetadataRow label="Size" value={formatBytes(metadata.size)} />
                  <MetadataRow
                    label="Last Modified"
                    value={metadata.lastModified ? formatDate(metadata.lastModified) : null}
                  />
                  <MetadataRow label="ETag" value={metadata.etag} copyable />
                  <MetadataRow label="Version ID" value={metadata.versionId} copyable />
                </div>
              </div>

              <Separator />

              {/* Content Headers */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Content Headers</h4>
                <div className="divide-y">
                  <MetadataRow label="Content-Type" value={metadata.contentType} />
                  <MetadataRow label="Content-Encoding" value={metadata.contentEncoding} />
                  <MetadataRow label="Content-Disposition" value={metadata.contentDisposition} />
                  <MetadataRow label="Content-Language" value={metadata.contentLanguage} />
                  <MetadataRow label="Cache-Control" value={metadata.cacheControl} />
                </div>
              </div>

              <Separator />

              {/* Storage Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Storage</h4>
                <div className="divide-y">
                  <MetadataRow label="Storage Class" value={metadata.storageClass || "STANDARD"} />
                </div>
              </div>

              {/* Custom Metadata */}
              {Object.keys(metadata.customMetadata || {}).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Custom Metadata</h4>
                    <div className="divide-y">
                      {Object.entries(metadata.customMetadata).map(([key, value]) => (
                        <MetadataRow
                          key={key}
                          label={`x-amz-meta-${key}`}
                          value={value}
                          copyable
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load metadata
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
