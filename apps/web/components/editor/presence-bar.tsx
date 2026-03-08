'use client';

import { useState, useEffect } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface PresenceUser {
  name: string;
  color: string;
}

interface PresenceBarProps {
  provider: HocuspocusProvider;
  currentUserId: string;
}

export function PresenceBar({ provider, currentUserId }: PresenceBarProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const update = () => {
      const states = awareness.getStates();
      const others: PresenceUser[] = [];

      states.forEach((state: Record<string, unknown>, clientId: number) => {
        if (clientId !== awareness.clientID && state.user) {
          const user = state.user as PresenceUser;
          if (!others.find((u) => u.name === user.name)) {
            others.push(user);
          }
        }
      });

      setUsers(others);
    };

    awareness.on('change', update);
    update();

    return () => {
      awareness.off('change', update);
    };
  }, [provider, currentUserId]);

  if (users.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {users.map((user) => (
          <Tooltip key={user.name}>
            <TooltipTrigger>
              <Avatar className="h-7 w-7 border-2" style={{ borderColor: user.color }}>
                <AvatarFallback
                  className="text-xs text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
