// src/users/users.service.ts

import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException(`User with email ${dto.email} already exists`);
        }

        return this.prisma.user.create({
            data: {
                email: dto.email,
                clerkUserId: dto.clerkUserId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                role: dto.role,
                clinic: dto.clinicId
                    ? { connect: { id: dto.clinicId } }
                    : undefined,
            },
        });
    }

    // All users belonging to a clinic
    async findAllByClinic(clinicId: string) {
        return this.prisma.user.findMany({
            where: { clinicId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { clinic: true },
        });

        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }

        return user;
    }

    async findByClerkId(clerkUserId: string) {
        const user = await this.prisma.user.findUnique({
            where: { clerkUserId },
            include: { clinic: true },
        });

        if (!user) {
            throw new NotFoundException(`No user found for Clerk ID ${clerkUserId}`);
        }

        return user;
    }

    async update(id: string, dto: UpdateUserDto) {
        await this.findOne(id); // throws if not found

        return this.prisma.user.update({
            where: { id },
            data: {
                email: dto.email,
                clerkUserId: dto.clerkUserId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                role: dto.role,
                clinic: dto.clinicId
                    ? { connect: { id: dto.clinicId } }
                    : undefined,
            },
        });
    }

    // Soft delete — never hard delete users in a medical system
    async deactivate(id: string) {
        await this.findOne(id); // throws if not found

        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }
}