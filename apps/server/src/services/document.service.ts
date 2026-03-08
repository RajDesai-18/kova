import { prisma } from '../lib/prisma.js';
import type { CreateDocumentInput, UpdateDocumentInput } from '@kova/shared';
import { AppError } from './auth.service.js';

export class DocumentService {
  static async list(userId: string) {
    // Get all workspace IDs the user owns or is a member of
    const [owned, memberships] = await Promise.all([
      prisma.workspace.findUnique({ where: { userId }, select: { id: true } }),
      prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      }),
    ]);

    const workspaceIds = [
      ...(owned ? [owned.id] : []),
      ...memberships.map((m) => m.workspaceId),
    ];

    // Deduplicate (owner is also a member)
    const uniqueIds = [...new Set(workspaceIds)];

    return prisma.document.findMany({
      where: { workspaceId: { in: uniqueIds }, isArchived: false },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async getById(id: string, userId: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    }

    await this.verifyAccess(userId, doc.workspaceId);
    return doc;
  }

  static async create(workspaceId: string, input: CreateDocumentInput) {
    const count = await prisma.document.count({
      where: { workspaceId, parentId: input.parentId ?? null },
    });

    return prisma.document.create({
      data: {
        title: input.title || 'Untitled',
        content: input.content ?? undefined,
        icon: input.icon,
        parentId: input.parentId ?? null,
        workspaceId,
        position: count,
      },
    });
  }

  static async update(id: string, userId: string, input: UpdateDocumentInput) {
    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    }

    await this.verifyAccess(userId, doc.workspaceId);

    return prisma.document.update({
      where: { id },
      data: input,
    });
  }

  static async delete(id: string, userId: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    await this.verifyAccess(userId, doc.workspaceId);

    // Soft-delete: archive this doc and all its children recursively
    await prisma.document.updateMany({
      where: {
        OR: [{ id }, { parentId: id }],
        workspaceId: doc.workspaceId,
      },
      data: { isArchived: true },
    });
    return { success: true };
  }

  static async listTrash(userId: string) {
    const [owned, memberships] = await Promise.all([
      prisma.workspace.findUnique({ where: { userId }, select: { id: true } }),
      prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } }),
    ]);
    const uniqueIds = [...new Set([
      ...(owned ? [owned.id] : []),
      ...memberships.map((m) => m.workspaceId),
    ])];

    return prisma.document.findMany({
      where: { workspaceId: { in: uniqueIds }, isArchived: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, icon: true, parentId: true, updatedAt: true },
    });
  }

  static async restore(id: string, userId: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    await this.verifyAccess(userId, doc.workspaceId);

    const parentArchived = doc.parentId
      ? await prisma.document.findFirst({ where: { id: doc.parentId, isArchived: true } })
      : null;

    await prisma.document.update({
      where: { id },
      data: { isArchived: false, parentId: parentArchived ? null : doc.parentId },
    });
    return { success: true };
  }

  static async permanentDelete(id: string, userId: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    await this.verifyAccess(userId, doc.workspaceId);
    await prisma.document.delete({ where: { id } });
    return { success: true };
  }

  static async getWorkspaceId(userId: string): Promise<string> {
    const workspace = await prisma.workspace.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!workspace) {
      throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found', 404);
    }

    return workspace.id;
  }

  /** Verify the user has access to a workspace (via ownership or membership). */
  static async verifyAccess(userId: string, workspaceId: string): Promise<void> {
    // Check ownership first (fast path)
    const owned = await prisma.workspace.findFirst({
      where: { id: workspaceId, userId },
      select: { id: true },
    });

    if (owned) return;

    // Check membership
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    });

    if (!member) {
      throw new AppError('ACCESS_DENIED', 'Access denied', 403);
    }
  }
}
