import { invoke } from "@tauri-apps/api/core";
import type { S3Connection, CreateConnectionInput } from "@/types/connection";
import type { BucketInfo, BucketStats } from "@/types/bucket";
import type { S3Object, ListObjectsResult, ObjectMetadata } from "@/types/object";

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  return invoke<T>(command, args);
}

export const commands = {
  // Connections
  createConnection: (data: CreateConnectionInput) =>
    invokeCommand<S3Connection>("create_connection", data as unknown as Record<string, unknown>),

  listConnections: () => invokeCommand<S3Connection[]>("list_connections"),

  getConnection: (connectionId: string) =>
    invokeCommand<S3Connection>("get_connection", { connectionId }),

  updateConnection: (connectionId: string, data: Partial<CreateConnectionInput>) =>
    invokeCommand<S3Connection>("update_connection", { connectionId, ...data }),

  deleteConnection: (connectionId: string) =>
    invokeCommand<void>("delete_connection", { connectionId }),

  testConnection: (data: CreateConnectionInput) =>
    invokeCommand<boolean>("test_connection", data as unknown as Record<string, unknown>),

  exportConnections: () => invokeCommand<string>("export_connections"),

  importConnections: (jsonData: string) =>
    invokeCommand<S3Connection[]>("import_connections", { jsonData }),

  // Buckets
  listBuckets: (connectionId: string) =>
    invokeCommand<BucketInfo[]>("list_buckets", { connectionId }),

  createBucket: (connectionId: string, bucketName: string, region?: string) =>
    invokeCommand<void>("create_bucket", { connectionId, bucketName, region }),

  deleteBucket: (connectionId: string, bucketName: string) =>
    invokeCommand<void>("delete_bucket", { connectionId, bucketName }),

  getBucketLocation: (connectionId: string, bucketName: string) =>
    invokeCommand<string | null>("get_bucket_location", { connectionId, bucketName }),

  headBucket: (connectionId: string, bucketName: string) =>
    invokeCommand<boolean>("head_bucket", { connectionId, bucketName }),

  getBucketVersioning: (connectionId: string, bucketName: string) =>
    invokeCommand<string | null>("get_bucket_versioning", { connectionId, bucketName }),

  getBucketStats: (connectionId: string, bucketName: string) =>
    invokeCommand<BucketStats>("get_bucket_stats", { connectionId, bucketName }),

  // Objects
  listObjects: (connectionId: string, bucket: string, prefix: string, maxKeys?: number) =>
    invokeCommand<ListObjectsResult>("list_objects", {
      connectionId,
      bucket,
      prefix,
      maxKeys,
    }),

  getObjectDetails: (connectionId: string, bucket: string, key: string) =>
    invokeCommand<S3Object>("get_object_details", {
      connectionId,
      bucket,
      key,
    }),

  getObjectMetadata: (connectionId: string, bucket: string, key: string) =>
    invokeCommand<ObjectMetadata>("get_object_metadata", {
      connectionId,
      bucket,
      key,
    }),

  uploadFile: (
    connectionId: string,
    bucket: string,
    key: string,
    filePath: string
  ) =>
    invokeCommand<void>("upload_file", {
      connectionId,
      bucket,
      key,
      filePath,
    }),

  downloadFile: (
    connectionId: string,
    bucket: string,
    key: string,
    destination: string
  ) =>
    invokeCommand<void>("download_file", {
      connectionId,
      bucket,
      key,
      destination,
    }),

  deleteObjects: (connectionId: string, bucket: string, keys: string[]) =>
    invokeCommand<void>("delete_objects", { connectionId, bucket, keys }),

  createFolder: (connectionId: string, bucket: string, path: string) =>
    invokeCommand<void>("create_folder", { connectionId, bucket, path }),

  getPresignedUrl: (
    connectionId: string,
    bucket: string,
    key: string,
    expiresInSecs?: number
  ) =>
    invokeCommand<string>("get_presigned_url", {
      connectionId,
      bucket,
      key,
      expiresInSecs,
    }),

  getObjectText: (
    connectionId: string,
    bucket: string,
    key: string,
    maxSize?: number
  ) =>
    invokeCommand<string>("get_object_text", {
      connectionId,
      bucket,
      key,
      maxSize,
    }),

  copyObject: (
    connectionId: string,
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ) =>
    invokeCommand<void>("copy_object", {
      connectionId,
      sourceBucket,
      sourceKey,
      destBucket,
      destKey,
    }),

  renameObject: (
    connectionId: string,
    bucket: string,
    oldKey: string,
    newKey: string
  ) =>
    invokeCommand<void>("rename_object", {
      connectionId,
      bucket,
      oldKey,
      newKey,
    }),
};
