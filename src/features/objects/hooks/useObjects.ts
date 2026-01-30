import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import type { S3Object } from "@/types/object";

const PAGE_SIZE = 500;

export function useObjects() {
  const { activeConnectionId, activeBucket, currentPath } = useConnectionStore();
  const { clearSelection } = useUIStore();
  const queryClient = useQueryClient();

  const objectsQuery = useInfiniteQuery({
    queryKey: ["objects", activeConnectionId, activeBucket, currentPath],
    queryFn: async () => {
      const result = await commands.listObjects(
        activeConnectionId!,
        activeBucket!,
        currentPath,
        PAGE_SIZE
      );
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.isTruncated) {
        return allPages.length;
      }
      return undefined;
    },
    enabled: !!activeConnectionId && !!activeBucket,
    staleTime: 30000,
  });

  // Flatten all pages into single arrays
  const { objects, prefixes, hasMore, isTruncated } = useMemo(() => {
    if (!objectsQuery.data?.pages) {
      return { objects: [] as S3Object[], prefixes: [] as string[], hasMore: false, isTruncated: false };
    }

    const allObjects: S3Object[] = [];
    const allPrefixes: string[] = [];
    let truncated = false;

    for (const page of objectsQuery.data.pages) {
      allObjects.push(...page.objects);
      allPrefixes.push(...page.prefixes);
      truncated = page.isTruncated;
    }

    // Deduplicate prefixes (they might appear across pages)
    const uniquePrefixes = [...new Set(allPrefixes)];

    return {
      objects: allObjects,
      prefixes: uniquePrefixes,
      hasMore: objectsQuery.hasNextPage ?? false,
      isTruncated: truncated,
    };
  }, [objectsQuery.data?.pages, objectsQuery.hasNextPage]);

  const deleteMutation = useMutation({
    mutationFn: (keys: string[]) =>
      commands.deleteObjects(activeConnectionId!, activeBucket!, keys),
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({
        queryKey: ["objects", activeConnectionId, activeBucket],
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (path: string) =>
      commands.createFolder(activeConnectionId!, activeBucket!, path),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["objects", activeConnectionId, activeBucket],
      });
    },
  });

  const loadMore = useCallback(() => {
    if (objectsQuery.hasNextPage && !objectsQuery.isFetchingNextPage) {
      objectsQuery.fetchNextPage();
    }
  }, [objectsQuery]);

  return {
    objects,
    prefixes,
    isLoading: objectsQuery.isLoading,
    isFetchingMore: objectsQuery.isFetchingNextPage,
    error: objectsQuery.error,
    refetch: objectsQuery.refetch,
    hasMore,
    isTruncated,
    loadMore,
    deleteObjects: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    createFolder: createFolderMutation.mutate,
    isCreatingFolder: createFolderMutation.isPending,
  };
}
