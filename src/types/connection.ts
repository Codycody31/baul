export type S3Provider =
  | "aws"
  | "minio"
  | "cloudflare_r2"
  | "digitalocean"
  | "backblaze"
  | "wasabi"
  | "custom";

export interface S3Connection {
  id: string;
  name: string;
  provider: S3Provider;
  endpoint: string;
  region: string;
  accessKey: string;
  useSsl: boolean;
  usePathStyle: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateConnectionInput {
  name: string;
  provider: S3Provider;
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  useSsl: boolean;
  usePathStyle: boolean;
}

export const PROVIDER_PRESETS: Record<
  S3Provider,
  { name: string; endpoint: string; region: string; useSsl: boolean; usePathStyle: boolean }
> = {
  aws: {
    name: "Amazon S3",
    endpoint: "https://s3.amazonaws.com",
    region: "us-east-1",
    useSsl: true,
    usePathStyle: false,
  },
  minio: {
    name: "MinIO",
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    useSsl: false,
    usePathStyle: true,
  },
  cloudflare_r2: {
    name: "Cloudflare R2",
    endpoint: "https://<account_id>.r2.cloudflarestorage.com",
    region: "auto",
    useSsl: true,
    usePathStyle: false,
  },
  digitalocean: {
    name: "DigitalOcean Spaces",
    endpoint: "https://<region>.digitaloceanspaces.com",
    region: "nyc3",
    useSsl: true,
    usePathStyle: false,
  },
  backblaze: {
    name: "Backblaze B2",
    endpoint: "https://s3.<region>.backblazeb2.com",
    region: "us-west-004",
    useSsl: true,
    usePathStyle: false,
  },
  wasabi: {
    name: "Wasabi",
    endpoint: "https://s3.<region>.wasabisys.com",
    region: "us-east-1",
    useSsl: true,
    usePathStyle: false,
  },
  custom: {
    name: "Custom S3-Compatible",
    endpoint: "",
    region: "us-east-1",
    useSsl: true,
    usePathStyle: false,
  },
};
