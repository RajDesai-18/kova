import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Kova',
  description: 'Collaborative AI-assisted workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
