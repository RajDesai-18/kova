import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@kova.app' },
    update: {},
    create: {
      email: 'demo@kova.app',
      name: 'Demo User',
      password: hashedPassword,
      workspace: {
        create: {
          name: "Demo User's Workspace",
        },
      },
    },
    include: { workspace: true },
  });

  const workspaceId = user.workspace!.id;

  // Ensure demo user is workspace owner member
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    update: {},
    create: { workspaceId, userId: user.id, role: 'owner' },
  });

  // Second demo user for collaboration testing
  const user2 = await prisma.user.upsert({
    where: { email: 'demo2@kova.app' },
    update: {},
    create: {
      email: 'demo2@kova.app',
      name: 'Collab User',
      password: hashedPassword,
      workspace: {
        create: {
          name: "Collab User's Workspace",
        },
      },
    },
    include: { workspace: true },
  });

  // Add demo2 as editor of demo's workspace
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user2.id } },
    update: {},
    create: { workspaceId, userId: user2.id, role: 'editor' },
  });

  // Make demo2 owner of their own workspace
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: user2.workspace!.id, userId: user2.id } },
    update: {},
    create: { workspaceId: user2.workspace!.id, userId: user2.id, role: 'owner' },
  });

  // Clean existing docs
  await prisma.document.deleteMany({ where: { workspaceId } });

  // Getting Started
  const gettingStarted = await prisma.document.create({
    data: {
      title: 'Getting Started',
      icon: '🚀',
      workspaceId,
      position: 0,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Welcome to Kova' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Kova is a collaborative workspace for organizing your thoughts, notes, and projects.' },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Quick Tips' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use the sidebar to navigate between documents' }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: "Type '/' to access slash commands" }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Select text to see formatting options' }] }],
              },
            ],
          },
        ],
      },
    },
  });

  // Nested child under Getting Started
  await prisma.document.create({
    data: {
      title: 'Keyboard Shortcuts',
      icon: '⌨️',
      workspaceId,
      parentId: gettingStarted.id,
      position: 0,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Keyboard Shortcuts' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Here are some useful keyboard shortcuts:' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Ctrl+B' }, { type: 'text', text: ' — Bold' }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Ctrl+I' }, { type: 'text', text: ' — Italic' }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Ctrl+E' }, { type: 'text', text: ' — Code' }] }],
              },
            ],
          },
        ],
      },
    },
  });

  // Project Notes
  await prisma.document.create({
    data: {
      title: 'Project Notes',
      icon: '📋',
      workspaceId,
      position: 1,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Project Notes' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Use this space to keep track of your project ideas and progress.' }],
          },
        ],
      },
    },
  });

  // Ideas
  await prisma.document.create({
    data: {
      title: 'Ideas',
      icon: '💡',
      workspaceId,
      position: 2,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'A place to capture your ideas...' }],
          },
        ],
      },
    },
  });

  console.log('Seed complete!');
  console.log('Demo account: demo@kova.app / password123');
  console.log('Collab account: demo2@kova.app / password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
