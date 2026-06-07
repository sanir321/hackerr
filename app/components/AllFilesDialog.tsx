"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Circle, CircleCheck, File } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatFileSize } from "@/lib/utils/file-utils";
import JSZip from "jszip";
import { toast } from "sonner";
import { useFileUrlCacheContext } from "../contexts/FileUrlCacheContext";
import { FilePart } from "@/types/file";

interface AllFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Array<{
    part: FilePart;
    messageIndex: number;
    partIndex: number;
  }>;
  chatTitle: string;
}

const AllFilesDialog = ({
  open,
  onOpenChange,
  files,
  chatTitle,
}: AllFilesDialogProps) => {
  const convex = useConvex();
  const fileUrlCache = useFileUrlCacheContext();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [fileUrls, setFileUrls] = useState<Map<number, string>>(new Map());
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFileUrls(new Map());
      setIsLoadingUrls(false);
      setSelectionMode(false);
      setSelectedFiles(new Set());
    }
    onOpenChange(newOpen);
  };

  // Batch fetch all URLs when dialog opens
  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function fetchAllUrls() {
      if (cancelled) return;
      setIsLoadingUrls(true);
      const urlMap = new Map<number, string>();

      // Fetch URLs in parallel
      await Promise.all(
        files.map(async (file, index) => {
          // If already has URL, use it
          if (file.part.url) {
            urlMap.set(index, file.part.url);
            return;
          }

          // Check cache first for storageId or fileId
          if (fileUrlCache) {
            if (file.part.storageId) {
              const cached = fileUrlCache.getCachedUrl(file.part.storageId);
              if (cached) {
                urlMap.set(index, cached);
                return;
              }
            }
            if (file.part.fileId) {
              const cached = fileUrlCache.getCachedUrl(file.part.fileId);
              if (cached) {
                urlMap.set(index, cached);
                return;
              }
            }
          }

          // Fetch URL based on storageId
          try {
            let url: string | null = null;

            if (file.part.storageId) {
              // Convex storage file - fetch URL
              url = await convex.query(api.fileStorage.getFileDownloadUrl, {
                storageId: file.part.storageId,
              });
              if (url && fileUrlCache) {
                fileUrlCache.setCachedUrl(file.part.storageId, url);
              }
            } else if (file.part.fileId) {
              // Resolve storageId from fileId first
              const fileDoc = await convex.query(api.fileStorage.getFileMetadata, {
                fileId: file.part.fileId as any,
              });
              if (fileDoc?.storage_id) {
                url = await convex.query(api.fileStorage.getFileDownloadUrl, {
                  storageId: fileDoc.storage_id,
                });
                if (url && fileUrlCache) {
                  fileUrlCache.setCachedUrl(file.part.fileId, url);
                }
              }
            }

            if (url) {
              urlMap.set(index, url);
            }
          } catch (error) {
            console.error(`Failed to fetch URL for file ${index}:`, error);
          }
        }),
      );

      if (!cancelled) {
        setFileUrls(urlMap);
        setIsLoadingUrls(false);
      }
    }

    fetchAllUrls();

    return () => {
      cancelled = true;
    };
  }, [open, files, convex, fileUrlCache]);

  const toggleFileSelection = (index: number) => {
    const newSelected = new Set(selectedFiles);
    const key = index.toString();
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFiles(newSelected);
  };

  const handleDownload = async (index: number) => {
    const file = files[index];
    const url = fileUrls.get(index) || file.part.url;

    if (!url) {
      toast.error("Download URL not available");
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.part.name || file.part.filename || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download file");
    }
  };

  const handleBatchDownload = async () => {
    const filesToDownload = files
      .map((file, index) => ({ file, index }))
      .filter(({ index }) => selectedFiles.has(index.toString()));

    if (filesToDownload.length === 0) return;

    try {
      const zip = new JSZip();

      // Use already fetched URLs or fetch missing ones
      await Promise.all(
        filesToDownload.map(async ({ file, index }) => {
          try {
            let url = fileUrls.get(index) || file.part.url;

            // Fetch URL if not already available
            if (!url) {
              if (file.part.storageId) {
                const fetchedUrl = await convex.query(
                  api.fileStorage.getFileDownloadUrl,
                  {
                    storageId: file.part.storageId,
                  },
                );
                url = fetchedUrl || undefined;
              } else if (file.part.fileId) {
                const fileDoc = await convex.query(api.fileStorage.getFileMetadata, {
                  fileId: file.part.fileId as any,
                });
                if (fileDoc?.storage_id) {
                  const fetchedUrl = await convex.query(
                    api.fileStorage.getFileDownloadUrl,
                    {
                      storageId: fileDoc.storage_id,
                    },
                  );
                  url = fetchedUrl || undefined;
                }
              }
            }

            if (url) {
              const response = await fetch(url);
              const blob = await response.blob();
              const fileName =
                file.part.name ||
                file.part.filename ||
                `file-${file.partIndex}`;
              zip.file(fileName, blob);
            }
          } catch (error) {
            console.error(`Error adding ${file.part.name} to ZIP:`, error);
          }
        }),
      );

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${chatTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
      setSelectionMode(false);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error("Batch download failed:", error);
      toast.error("Failed to create ZIP archive");
    }
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map((_, i) => i.toString())));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">All Files</DialogTitle>
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              All files
              <Badge variant="secondary" className="rounded-full px-2 py-0">
                {files.length}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-64">
              {chatTitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectionMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                onClick={() => setSelectionMode(true)}
              >
                Select
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={
                    selectedFiles.size === files.length
                      ? deselectAll
                      : selectAll
                  }
                >
                  {selectedFiles.size === files.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedFiles(new Set());
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-1 gap-2">
            {files.map((file, index) => {
              const isSelected = selectedFiles.has(index.toString());
              const url = fileUrls.get(index) || file.part.url;

              return (
                <div
                  key={`${file.messageIndex}-${file.partIndex}`}
                  className={`
                    group flex items-center gap-3 p-3 rounded-xl border transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-border-hover hover:bg-muted/30"
                    }
                  `}
                >
                  {selectionMode && (
                    <button
                      onClick={() => toggleFileSelection(index)}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isSelected ? (
                        <CircleCheck className="h-5 w-5 text-primary fill-primary/10" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                  )}

                  <div className="shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      selectionMode
                        ? toggleFileSelection(index)
                        : handleDownload(index)
                    }
                  >
                    <div className="font-medium text-sm truncate">
                      {file.part.name || file.part.filename || "Unnamed file"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatFileSize(file.part.size || 0)}</span>
                      <span>•</span>
                      <span className="truncate max-w-40">
                        {file.part.mediaType || "Unknown type"}
                      </span>
                    </div>
                  </div>

                  {!selectionMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDownload(index)}
                      disabled={!url}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectionMode && (
          <footer className="p-4 border-t border-border bg-muted/20 shrink-0">
            <Button
              className="w-full rounded-xl gap-2"
              disabled={selectedFiles.size === 0 || isLoadingUrls}
              onClick={handleBatchDownload}
            >
              <Download className="h-4 w-4" />
              <span>
                {isLoadingUrls
                  ? "Preparing links..."
                  : `Download ${selectedFiles.size} ${selectedFiles.size === 1 ? "file" : "files"}`}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                Batch download ({selectedFiles.size})
              </span>
            </Button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { AllFilesDialog };
