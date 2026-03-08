import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Document {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentFull extends Document {
  content: unknown;
  isArchived: boolean;
  workspaceId: string;
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api<{ documents: Document[] }>('/documents').then((r) => r.documents),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => api<{ document: DocumentFull }>(`/documents/${id}`).then((r) => r.document),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { title?: string; parentId?: string | null }) =>
      api<{ document: DocumentFull }>('/documents', { method: 'POST', json: data }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push(`/documents/${data.document.id}`);
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: unknown; icon?: string | null }) =>
      api<{ document: DocumentFull }>(`/documents/${id}`, { method: 'PATCH', json: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ['documents', 'trash'],
    queryFn: () => api<{ documents: Document[] }>('/documents/trash').then((r) => r.documents),
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/documents/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/documents/${id}/permanent`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
