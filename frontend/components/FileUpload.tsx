"use client";

// ============================================================
// components/FileUpload.tsx
// Drag-and-drop + click-to-upload panel for PDF and TXT files.
// Shows upload progress, success confirmation, and error states.
// ============================================================

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { uploadDocument } from "@/services/api";
import type { UploadedDocument } from "@/types";

interface FileUploadProps {
  onUploadSuccess: (doc: UploadedDocument) => void;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; filename: string; progress: number }
  | { status: "success"; filename: string; chunkCount: number }
  | { status: "error"; message: string };

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const processFile = useCallback(
    async (file: File) => {
      // Validate client-side
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "txt"].includes(ext ?? "")) {
        setUploadState({
          status: "error",
          message: "Only PDF and TXT files are supported.",
        });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setUploadState({
          status: "error",
          message: "File exceeds the 20 MB limit.",
        });
        return;
      }

      setUploadState({ status: "uploading", filename: file.name, progress: 0 });

      try {
        const response = await uploadDocument(file);

        setUploadState({
          status: "success",
          filename: file.name,
          chunkCount: response.chunk_count,
        });

        onUploadSuccess({
          document_id: response.document_id,
          filename: response.filename,
          chunk_count: response.chunk_count,
          uploaded_at: new Date(),
          file_size_bytes: response.file_size_bytes,
        });

        // Reset to idle after 4 seconds so user can upload another file
        setTimeout(() => setUploadState({ status: "idle" }), 4000);
      } catch (err) {
        setUploadState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Upload failed. Try again.",
        });
      }
    },
    [onUploadSuccess]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) processFile(accepted[0]);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploadState.status === "uploading",
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Knowledge Base
      </p>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2",
          "rounded-xl border-2 border-dashed p-5 cursor-pointer",
          "transition-all duration-200",
          isDragActive
            ? "border-blue-400 bg-blue-500/10"
            : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/40",
          uploadState.status === "uploading" && "cursor-not-allowed opacity-70"
        )}
      >
        <input {...getInputProps()} />

        <DropZoneContent state={uploadState} isDragActive={isDragActive} />
      </div>

      {/* Error banner */}
      {uploadState.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/50 p-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{uploadState.message}</p>
          <button
            onClick={() => setUploadState({ status: "idle" })}
            className="ml-auto text-red-400 hover:text-red-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Drop zone content — changes based on upload state                  //
// ------------------------------------------------------------------ //

function DropZoneContent({
  state,
  isDragActive,
}: {
  state: UploadState;
  isDragActive: boolean;
}) {
  if (state.status === "uploading") {
    return (
      <>
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-300 font-medium">
          Uploading {state.filename}…
        </p>
        <p className="text-xs text-slate-500">
          Parsing → Chunking → Embedding → Storing
        </p>
      </>
    );
  }

  if (state.status === "success") {
    return (
      <>
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        <p className="text-sm text-emerald-300 font-medium">
          {state.filename} ingested
        </p>
        <p className="text-xs text-slate-500">
          {state.chunkCount} chunks added to knowledge base
        </p>
      </>
    );
  }

  if (isDragActive) {
    return (
      <>
        <Upload className="w-8 h-8 text-blue-400" />
        <p className="text-sm text-blue-300 font-medium">Drop to upload</p>
      </>
    );
  }

  return (
    <>
      <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-300 font-medium">
          Drop a PDF or TXT file
        </p>
        <p className="text-xs text-slate-500 mt-0.5">or click to browse</p>
      </div>
      <p className="text-[10px] text-slate-600">Max 20 MB</p>
    </>
  );
}
