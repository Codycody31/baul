export interface S3Object {
  key: string;
  size: number;
  lastModified: number;
  etag: string | null;
  contentType: string | null;
  isDirectory: boolean;
}

export interface ListObjectsResult {
  objects: S3Object[];
  prefixes: string[];
  continuationToken: string | null;
  isTruncated: boolean;
}

export interface UploadProgress {
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

export interface ObjectMetadata {
  key: string;
  size: number;
  lastModified: number | null;
  etag: string | null;
  contentType: string | null;
  contentEncoding: string | null;
  contentDisposition: string | null;
  contentLanguage: string | null;
  cacheControl: string | null;
  storageClass: string | null;
  versionId: string | null;
  customMetadata: Record<string, string>;
}
