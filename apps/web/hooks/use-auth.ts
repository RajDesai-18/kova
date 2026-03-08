import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => api<{ user: User }>('/auth/me').then((r) => r.user),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', json: data }),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      router.push('/');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string }) =>
      api<{ user: User }>('/auth/register', { method: 'POST', json: data }),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      router.push('/');
    },
  });
}

export function useWsToken() {
  return useQuery({
    queryKey: ['ws-token'],
    queryFn: () => api<{ token: string }>('/auth/ws-token').then((r) => r.token),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });
}
