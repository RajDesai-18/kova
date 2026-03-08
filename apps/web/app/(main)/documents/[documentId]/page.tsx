'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { useDocument, useUpdateDocument } from '@/hooks/use-documents';
import { useUser, useWsToken } from '@/hooks/use-auth';
import { getUserColor } from '@/lib/user-color';
import { Editor } from '@/components/editor';
import { EmojiPicker } from '@/components/editor/emoji-picker';
import { PresenceBar } from '@/components/editor/presence-bar';
import { ConnectionStatus } from '@/components/editor/connection-status';
import { Skeleton } from '@/components/ui/skeleton';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const { data: doc, isLoading } = useDocument(documentId);
  const { data: currentUser } = useUser();
  const { data: wsToken } = useWsToken();
  const updateDoc = useUpdateDocument();
  const [title, setTitle] = useState('');
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  // Create/destroy HocuspocusProvider per document
  useEffect(() => {
    if (!wsToken || !documentId) return;

    const hocuspocusProvider = new HocuspocusProvider({
      url: WS_URL,
      name: documentId,
      document: ydoc,
      token: wsToken,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
    });

    setProvider(hocuspocusProvider);

    return () => {
      hocuspocusProvider.destroy();
      setProvider(null);
      setIsConnected(false);
    };
  }, [documentId, wsToken, ydoc]);

  useEffect(() => {
    if (doc) setTitle(doc.title);
  }, [doc]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateDoc.mutate({ id: documentId, title: newTitle });
    }, 500);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const proseMirror = editorWrapperRef.current?.querySelector('.ProseMirror') as HTMLElement;
      proseMirror?.focus();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    updateDoc.mutate({ id: documentId, icon: emoji });
  };

  const handleEmojiRemove = () => {
    updateDoc.mutate({ id: documentId, icon: null });
  };

  if (isLoading || !currentUser) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (!doc) return null;

  const userInfo = {
    name: currentUser.name,
    color: getUserColor(currentUser.id),
  };

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-2 flex items-center justify-between">
        {provider && <PresenceBar provider={provider} currentUserId={currentUser.id} />}
        {provider && <ConnectionStatus provider={provider} />}
      </div>
      <div className="mb-4 flex items-center gap-2">
        <EmojiPicker
          currentEmoji={doc.icon}
          onSelect={handleEmojiSelect}
          onRemove={handleEmojiRemove}
        />
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          className="w-full border-none bg-transparent text-4xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>
      <div ref={editorWrapperRef}>
        {provider && isConnected ? (
          <Editor
            provider={provider}
            ydoc={ydoc}
            user={userInfo}
            initialContent={doc.content}
          />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </div>
    </div>
  );
}
