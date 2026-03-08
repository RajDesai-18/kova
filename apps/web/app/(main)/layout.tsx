'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/hooks/use-auth';
import { Sidebar } from '@/components/sidebar';
import { useUIStore } from '@/stores/ui';
import { Skeleton } from '@/components/ui/skeleton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.push('/login');
    }
  }, [isLoading, isError, user, router]);

  if (isLoading || (!user && !isError)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
