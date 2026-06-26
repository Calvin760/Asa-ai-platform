// apps/api/src/common/guards/clerk-auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    let clerkUserId: string;

    try {
      const payload = await clerkClient.verifyToken(token);
      clerkUserId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      include: { clinic: true },
    });

    // Block only users that exist but were disabled
    if (user && !user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    // Important:
    // Allow valid Clerk users through even if they do not exist in DB yet.
    // Onboarding/user creation needs this.
    request.user = user;
    request.clerkUserId = clerkUserId;

    return true;
  }
}