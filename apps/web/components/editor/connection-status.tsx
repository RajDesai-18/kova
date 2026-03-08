'use client';

import { useState, useEffect, useRef } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';

type Status = 'connecting' | 'connected' | 'disconnected';

interface ConnectionStatusProps {
  provider: HocuspocusProvider;
}

export function ConnectionStatus({ provider }: ConnectionStatusProps) {
  const [status, setStatus] = useState<Status>('connecting');
  const [visible, setVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    const handleStatus = ({ status: newStatus }: { status: Status }) => {
      setStatus(newStatus);
      setVisible(true);

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      if (newStatus === 'connected') {
        if (wasDisconnectedRef.current) {
          toast.success('Changes synced');
          wasDisconnectedRef.current = false;
        }
        // Hide the connected indicator after 3 seconds
        hideTimeoutRef.current = setTimeout(() => setVisible(false), 3000);
      }

      if (newStatus === 'disconnected') {
        wasDisconnectedRef.current = true;
      }
    };

    provider.on('status', handleStatus);

    return () => {
      provider.off('status', handleStatus);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [provider]);

  if (!visible && status === 'connected') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status === 'connected'
            ? 'bg-green-500'
            : status === 'connecting'
              ? 'animate-pulse bg-yellow-500'
              : 'bg-red-500'
        }`}
      />
      {status === 'connecting' && <span>Connecting...</span>}
      {status === 'disconnected' && <span>Offline</span>}
    </div>
  );
}
