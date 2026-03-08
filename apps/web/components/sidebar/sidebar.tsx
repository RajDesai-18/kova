'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui';
import { useState } from 'react';
import { useDocuments, useCreateDocument, useTrash, useRestoreDocument, usePermanentDeleteDocument } from '@/hooks/use-documents';
import { useLogout, useUser } from '@/hooks/use-auth';
import { DocumentTree } from './document-tree';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const { data: user } = useUser();
  const { data: documents } = useDocuments();
  const createDoc = useCreateDocument();
  const logout = useLogout();
  const { data: trash } = useTrash();
  const [trashOpen, setTrashOpen] = useState(false);
  const restoreDoc = useRestoreDocument();
  const permanentDelete = usePermanentDeleteDocument();

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-screen flex-col border-r border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted text-sm font-medium">
                {user && (
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                )}
                <span className="truncate max-w-[140px]">{user?.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => logout.mutate()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents</span>
              <button
                onClick={() => createDoc.mutate({})}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="New page"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <DocumentTree documents={documents || []} />
          </div>

          <div className="border-t border-border p-2">
            <button
              onClick={() => setTrashOpen(!trashOpen)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Trash</span>
              {trash && trash.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{trash.length}</span>
              )}
            </button>
            {trashOpen && trash && trash.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {trash.map((doc) => (
                  <div key={doc.id} className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground">
                    <span className="truncate flex-1">{doc.icon || ''} {doc.title || 'Untitled'}</span>
                    <button
                      onClick={() => restoreDoc.mutate(doc.id)}
                      className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted"
                      title="Restore"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => permanentDelete.mutate(doc.id)}
                      className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted text-destructive"
                      title="Delete forever"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
