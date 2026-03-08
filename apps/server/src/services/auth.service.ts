import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { RegisterInput, LoginInput } from '@kova/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'Email already in use', 409);
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        workspace: {
          create: {
            name: `${input.name}'s Workspace`,
          },
        },
      },
      include: { workspace: true },
    });

    // Create workspace membership record for the owner
    await prisma.workspaceMember.create({
      data: {
        workspaceId: user.workspace!.id,
        userId: user.id,
        role: 'owner',
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  static async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    return user;
  }
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
