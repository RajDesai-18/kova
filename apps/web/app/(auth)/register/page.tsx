'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRegister } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ name, email, password });
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Get started with Kova</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {register.error && (
          <p className="text-sm text-red-500">
            {register.error instanceof Error ? register.error.message : 'Registration failed'}
          </p>
        )}
        <Button type="submit" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
