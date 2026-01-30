import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import {
  S3Provider,
  PROVIDER_PRESETS,
  type CreateConnectionInput,
} from "@/types/connection";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS: { value: S3Provider; label: string }[] = [
  { value: "aws", label: "Amazon S3" },
  { value: "minio", label: "MinIO" },
  { value: "cloudflare_r2", label: "Cloudflare R2" },
  { value: "digitalocean", label: "DigitalOcean Spaces" },
  { value: "backblaze", label: "Backblaze B2" },
  { value: "wasabi", label: "Wasabi" },
  { value: "custom", label: "Custom S3-Compatible" },
];

export function ConnectionDialog({ open, onOpenChange }: ConnectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addConnection, setActiveConnection } = useConnectionStore();

  const [formData, setFormData] = useState<CreateConnectionInput>({
    name: "",
    provider: "aws",
    endpoint: PROVIDER_PRESETS.aws.endpoint,
    region: PROVIDER_PRESETS.aws.region,
    accessKey: "",
    secretKey: "",
    useSsl: PROVIDER_PRESETS.aws.useSsl,
    usePathStyle: PROVIDER_PRESETS.aws.usePathStyle,
  });

  const [testing, setTesting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateConnectionInput) =>
      commands.createConnection({
        name: data.name,
        provider: data.provider,
        endpoint: data.endpoint,
        region: data.region,
        accessKey: data.accessKey,
        secretKey: data.secretKey,
        useSsl: data.useSsl,
        usePathStyle: data.usePathStyle,
      }),
    onSuccess: (connection) => {
      addConnection(connection);
      setActiveConnection(connection.id);
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      onOpenChange(false);
      resetForm();
      toast({
        title: "Connection created",
        description: `Successfully connected to ${connection.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create connection",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleProviderChange = (provider: S3Provider) => {
    const preset = PROVIDER_PRESETS[provider];
    setFormData({
      ...formData,
      provider,
      endpoint: preset.endpoint,
      region: preset.region,
      useSsl: preset.useSsl,
      usePathStyle: preset.usePathStyle,
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await commands.testConnection(formData);
      toast({
        title: "Connection successful",
        description: "Successfully connected to the S3 endpoint",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "aws",
      endpoint: PROVIDER_PRESETS.aws.endpoint,
      region: PROVIDER_PRESETS.aws.region,
      accessKey: "",
      secretKey: "",
      useSsl: PROVIDER_PRESETS.aws.useSsl,
      usePathStyle: PROVIDER_PRESETS.aws.usePathStyle,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Connection</DialogTitle>
            <DialogDescription>
              Connect to an S3-compatible storage provider.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder="My S3 Bucket"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => handleProviderChange(v as S3Provider)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="https://s3.amazonaws.com"
                value={formData.endpoint}
                onChange={(e) =>
                  setFormData({ ...formData, endpoint: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="us-east-1"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <Input
                id="accessKey"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={formData.accessKey}
                onChange={(e) =>
                  setFormData({ ...formData, accessKey: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={formData.secretKey}
                onChange={(e) =>
                  setFormData({ ...formData, secretKey: e.target.value })
                }
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="useSsl"
                  checked={formData.useSsl}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useSsl: checked })
                  }
                />
                <Label htmlFor="useSsl">Use SSL</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="usePathStyle"
                  checked={formData.usePathStyle}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, usePathStyle: checked })
                  }
                />
                <Label htmlFor="usePathStyle">Path Style</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !formData.endpoint || !formData.accessKey}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
