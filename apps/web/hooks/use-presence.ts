import { useQuery } from '@tanstack/react-query';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
// Convert ws:// to http:// for the REST presence endpoint
const PRESENCE_URL = WS_URL.replace(/^ws/, 'http');

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

type GlobalPresence = Record<string, PresenceUser[]>;

export function useGlobalPresence() {
  return useQuery<GlobalPresence>({
    queryKey: ['global-presence'],
    queryFn: async () => {
      const res = await fetch(`${PRESENCE_URL}/presence`, {
        credentials: 'include',
      });
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}
