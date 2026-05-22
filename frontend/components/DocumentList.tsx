"use client";

// ============================================================
// components/DocumentList.tsx
// Shows the list of documents that have been uploaded and
// ingested into the knowledge base during this session.
// ============================================================

import { FileText, Database } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import type { UploadedDocument } from "@/types";

interface DocumentListProps {
  documents: UploadedDocument[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Database className="w-8 h-8 text-slate-700" />
        <p className="text-xs text-slate-600">No documents yet</p>
        <p className="text-[10px] text-slate-700">
          Upload a PDF or TXT to enable the chatbot
        </p>
      </div>
    );
  }

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Stats row */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider">
          Indexed documents
        </p>
        <span className="text-[10px] text-blue-400 font-medium">
          {totalChunks} chunks
        </span>
      </div>

      {/* Document cards */}
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {documents.map((doc) => (
          <DocumentCard key={doc.document_id} doc={doc} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: UploadedDocument }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
        <FileText className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">
          {doc.filename}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {doc.chunk_count} chunks · {formatFileSize(doc.file_size_bytes)}
        </p>
      </div>
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1" />
    </div>
  );
}
