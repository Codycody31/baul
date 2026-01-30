export interface BucketInfo {
  name: string;
  createdAt: number | null;
  region: string | null;
}

export interface BucketStats {
  name: string;
  objectCount: number;
  totalSize: number;
}
