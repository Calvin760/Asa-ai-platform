// src/clinic/clinic.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateClinicDto) {
        return this.prisma.clinic.create({
            data: {
                name: dto.name,
                phone: dto.phone,
                email: dto.email,
                address: dto.address,
                timezone: dto.timezone ?? 'Africa/Johannesburg',
                reminderSchedule: dto.reminderSchedule ?? '0 8 * * *',
                reminderHoursAhead: dto.reminderHoursAhead ?? 48,
            },
        });
    }

    async findAll() {
        return this.prisma.clinic.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
        });

        if (!clinic) {
            throw new NotFoundException(`Clinic ${id} not found`);
        }

        return clinic;
    }

    async findAllActive() {
        return this.prisma.clinic.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                timezone: true,
                reminderSchedule: true,
                reminderHoursAhead: true,
            },
        });
    }

    async update(id: string, dto: UpdateClinicDto) {
        await this.findOne(id);

        return this.prisma.clinic.update({
            where: { id },
            data: {
                name: dto.name,
                phone: dto.phone,
                email: dto.email,
                address: dto.address,
                timezone: dto.timezone,
                reminderSchedule: dto.reminderSchedule,
                reminderHoursAhead: dto.reminderHoursAhead,
                isActive: dto.isActive,
                twilioWhatsAppNumber: dto.twilioWhatsAppNumber,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.clinic.delete({
            where: { id },
        });
    }
}