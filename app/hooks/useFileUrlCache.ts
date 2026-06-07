import { useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { isSupportedImageMediaType } from "@/lib/utils/upload-policy";
import type { ChatMessage } from "@/types/chat";

const URL_CACHE_EXPIRATION = 50 * 60 * 1000; // 50 minutes (signed URLs expire in 1 hour)
const MAX_BATCH_SIZE = 50;

interface CachedUrl {
  url: string;
  timestamp: number;
}

/**
 * Hook to manage prefetching and caching of file URLs
 *
 * Features:
 * - Batch prefetches URLs for all image files in messages (images need eager loading)
 * - Caches URLs with expiration handling
 * - Provides methods to get and set cached URLs (for lazy-loaded non-image files)
 * - Automatically cleans up expired URLs
 */
export function useFileUrlCache(messages: ChatMessage[]) {
  const getFileUrlsBatchAction = useAction(
    api.fileStorage.getFileUrlsBatchAction,
  );
  const urlCacheRef = useRef<Map<string, CachedUrl>>(new Map());
  const prefetchedIdsRef = useRef<Set<string>>(new Set());

  // Get cached URL for a file (returns null if expired or not cached)
  // Keyed by fileId OR storageId
  const getCachedUrl = useCallback((key: string): string | null => {
    const cached = urlCacheRef.current.get(key);
    if (!cached) return null;

    // Check if URL has expired
    const now = Date.now();
    if (now - cached.timestamp > URL_CACHE_EXPIRATION) {
      urlCacheRef.current.delete(key);
      prefetchedIdsRef.current.delete(key);
      return null;
    }

    return cached.url;
  }, []);

  // Set/update cached URL for a file (used for lazy-loaded non-image files)
  const setCachedUrl = useCallback((key: string, url: string) => {
    const now = Date.now();
    urlCacheRef.current.set(key, { url, timestamp: now });
    prefetchedIdsRef.current.add(key);
  }, []);

  // Prefetch image URLs for messages
  useEffect(() => {
    async function prefetchImageUrls() {
      // Track seen storageIds within this run to avoid duplicates
      const seenInThisRun = new Set<string>();
      const storageIds: string[] = [];

      for (const message of messages) {
        if (!message.fileDetails) continue;

        for (const file of message.fileDetails) {
          // Only process files that:
          // 1. Have a storageId
          // 2. Are supported image types
          // 3. Haven't been prefetched yet
          // 4. Haven't been seen in this run
          const storageIdStr = file.storageId ? String(file.storageId) : "";
          if (
            storageIdStr &&
            file.mediaType &&
            isSupportedImageMediaType(file.mediaType) &&
            !prefetchedIdsRef.current.has(storageIdStr) &&
            !seenInThisRun.has(storageIdStr)
          ) {
            storageIds.push(storageIdStr);
            seenInThisRun.add(storageIdStr);
          }
        }
      }

      // Also collect image files from message parts
      for (const message of messages) {
        for (const part of message.parts) {
          if (
            part.type === "file" &&
            "storageId" in part &&
            part.storageId &&
            part.mediaType &&
            isSupportedImageMediaType(part.mediaType)
          ) {
            const storageIdStr = String(part.storageId);
            if (
              !prefetchedIdsRef.current.has(storageIdStr) &&
              !seenInThisRun.has(storageIdStr)
            ) {
              storageIds.push(storageIdStr);
              seenInThisRun.add(storageIdStr);
            }
          }
        }
      }

      // If no new images to prefetch, return early
      if (storageIds.length === 0) {
        return;
      }

      // Batch fetch URLs with deduplicated storageIds, chunked to respect server limit
      try {
        const chunks: Array<Array<string>> = [];
        for (let i = 0; i < storageIds.length; i += MAX_BATCH_SIZE) {
          chunks.push(storageIds.slice(i, i + MAX_BATCH_SIZE));
        }

        const urlResults = await Promise.all(
          chunks.map((chunk) => getFileUrlsBatchAction({ storageIds: chunk })),
        );

        const now = Date.now();
        urlResults.forEach((urls: (string | null)[], chunkIndex: number) => {
          const chunkStorageIds = chunks[chunkIndex];
          urls.forEach((url: string | null, index: number) => {
            if (url) {
              const storageId = chunkStorageIds[index];
              urlCacheRef.current.set(storageId, { url, timestamp: now });
              prefetchedIdsRef.current.add(storageId);
            }
          });
        });
      } catch (error) {
        console.error("Failed to prefetch image URLs:", error);
      }
    }

    prefetchImageUrls();
  }, [messages, getFileUrlsBatchAction]);

  // Periodic cleanup of expired entries
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        for (const [key, cached] of urlCacheRef.current.entries()) {
          if (now - cached.timestamp > URL_CACHE_EXPIRATION) {
            urlCacheRef.current.delete(key);
            prefetchedIdsRef.current.delete(key);
          }
        }
      },
      5 * 60 * 1000,
    ); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return { getCachedUrl, setCachedUrl };
}
