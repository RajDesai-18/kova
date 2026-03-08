import { Server } from '@hocuspocus/server';
import type { onAuthenticatePayload } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Redis } from '@hocuspocus/extension-redis';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import { prisma } from '../lib/prisma.js';

const PORT = parseInt(process.env.HOCUSPOCUS_PORT || '3002', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
  };
}

const redisConfig = parseRedisUrl(REDIS_URL);

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const server = new Server({
  async onRequest({ request, response, instance }) {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);

    if (url.pathname === '/presence') {
      response.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
        throw null;
      }

      const presence: Record<string, Array<{ userId: string; name: string; color: string }>> = {};

      for (const [docName, doc] of instance.documents) {
        const users: Array<{ userId: string; name: string; color: string }> = [];
        const awareness = doc.awareness;
        const states = awareness.getStates();

        states.forEach((state: Record<string, unknown>) => {
          if (state.user) {
            const user = state.user as { userId: string; name: string; color: string };
            if (!users.find((u) => u.userId === user.userId)) {
              users.push(user);
            }
          }
        });

        if (users.length > 0) {
          presence[docName] = users;
        }
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(presence));
      throw null;
    }
  },

  async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const userId = payload.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify document access via workspace ownership or membership
      const document = await prisma.document.findUnique({
        where: { id: documentName },
        select: { workspaceId: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const ownedWorkspace = await prisma.workspace.findUnique({
        where: { userId },
        select: { id: true },
      });

      const isOwner = ownedWorkspace?.id === document.workspaceId;

      if (!isOwner) {
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: document.workspaceId,
              userId,
            },
          },
        });

        if (!membership) {
          throw new Error('Access denied');
        }
      }

      return { userId: user.id, userName: user.name };
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid or expired token');
      }
      throw err;
    }
  },

  extensions: [
    new Database({
      async fetch({ documentName }) {
        const doc = await prisma.document.findUnique({
          where: { id: documentName },
          select: { ydoc: true },
        });

        if (doc?.ydoc) {
          return new Uint8Array(doc.ydoc);
        }

        return null;
      },

      async store({ documentName, state }) {
        // Convert Y.Doc to Tiptap JSON for the content column
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(state));
        const json = yDocToProsemirrorJSON(ydoc, 'default');

        await prisma.document.update({
          where: { id: documentName },
          data: {
            ydoc: Buffer.from(state),
            content: json,
          },
        });
      },
    }),

    new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
    }),
  ],
});

server.listen(PORT, () => {
  console.log(`Hocuspocus WebSocket server running on port ${PORT}`);
});
