'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { useCreateDocument, useDeleteDocument } from '@/hooks/use-documents';
import { useGlobalPresence } from '@/hooks/use-presence';
import { PresenceDots } from './presence-dots';

interface DocItem {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
}

interface DocumentTreeProps {
  documents: DocItem[];
  parentId?: string | null;
  depth?: number;
}

export function DocumentTree({ documents, parentId = null, depth = 0 }: DocumentTreeProps) {
  const { data: presence } = useGlobalPresence();
  const items = documents.filter((d) => d.parentId === parentId);

  if (items.length === 0 && depth === 0) {
    return (
      <p className="px-2 py-4 text-center text-sm text-muted-foreground">No documents yet</p>
    );
  }

  return (
    <div>
      {items.map((doc) => (
        <DocumentItem key={doc.id} doc={doc} documents={documents} depth={depth} presenceUsers={presence?.[doc.id] || []} />
      ))}
    </div>
  );
}

function DocumentItem({ doc, documents, depth, presenceUsers }: { doc: DocItem; documents: DocItem[]; depth: number; presenceUsers: Array<{ color: string }> }) {
  const router = useRouter();
  const params = useParams();
  const [expanded, setExpanded] = useState(true);
  const createDoc = useCreateDocument();
  const deleteDoc = useDeleteDocument();
  const isActive = params.documentId === doc.id;
  const children = documents.filter((d) => d.parentId === doc.id);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors ${
          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => router.push(`/documents/${doc.id}`)}
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 rounded p-0.5 hover:bg-muted"
          >
            <svg
              className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="truncate flex-1">{doc.icon || ''} {doc.title || 'Untitled'}</span>
        <PresenceDots users={presenceUsers} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            createDoc.mutate({ parentId: doc.id });
          }}
          className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted"
        >
          <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteDoc.mutate(doc.id);
            if (params.documentId === doc.id) {
              router.push('/');
            }
          }}
          className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted"
          title="Move to trash"
        >
          <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {expanded && children.length > 0 && (
        <DocumentTree documents={documents} parentId={doc.id} depth={depth + 1} />
      )}
    </div>
  );
}
