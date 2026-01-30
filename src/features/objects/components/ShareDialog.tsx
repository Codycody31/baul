import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Copy, Check, Link } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useCopyToClipboard } from "@/hooks/useKeyboardShortcuts";
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

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectKey: string;
}

const EXPIRATION_OPTIONS = [
  { value: "3600", label: "1 hour" },
  { value: "21600", label: "6 hours" },
  { value: "86400", label: "24 hours" },
  { value: "604800", label: "7 days" },
  { value: "custom", label: "Custom" },
];

export function ShareDialog({ open, onOpenChange, objectKey }: ShareDialogProps) {
  const { activeConnectionId, activeBucket } = useConnectionStore();
  const copyToClipboard = useCopyToClipboard();
  const { toast } = useToast();

  const [expiration, setExpiration] = useState("3600");
  const [customHours, setCustomHours] = useState("24");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const expiresInSecs =
        expiration === "custom"
          ? parseInt(customHours) * 3600
          : parseInt(expiration);

      return commands.getPresignedUrl(
        activeConnectionId!,
        activeBucket!,
        objectKey,
        expiresInSecs
      );
    },
    onSuccess: (url) => {
      setGeneratedUrl(url);
    },
    onError: (error) => {
      toast({
        title: "Failed to generate URL",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!generatedUrl) return;

    const success = await copyToClipboard(generatedUrl);
    if (success) {
      setCopied(true);
      toast({ title: "URL copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedUrl(null);
    setCopied(false);
    setExpiration("3600");
    setCustomHours("24");
    onOpenChange(false);
  };

  const fileName = objectKey.split("/").pop() || objectKey;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Object</DialogTitle>
          <DialogDescription className="truncate">
            Generate a presigned URL for "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Link Expiration</Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {expiration === "custom" && (
            <div className="space-y-2">
              <Label>Custom Duration (hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: 168 hours (7 days)
              </p>
            </div>
          )}

          {generatedUrl && (
            <div className="space-y-2">
              <Label>Generated URL</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL will expire after the selected duration.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {generatedUrl ? "Close" : "Cancel"}
          </Button>
          {!generatedUrl && (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link className="mr-2 h-4 w-4" />
              )}
              Generate URL
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
