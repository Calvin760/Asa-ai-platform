// src/patients/patients.service.ts

import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class PatientsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreatePatientDto, requestingUser?: any) {
        const existing = await this.prisma.patient.findFirst({
            where: {
                clinicId: dto.clinicId,
                phone: dto.phone,
                isActive: true,
            },
        });

        if (existing) {
            throw new ConflictException(
                `A patient with phone ${dto.phone} already exists in this clinic`,
            );
        }

        const patient = await this.prisma.patient.create({
            data: {
                clinicId: dto.clinicId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                email: dto.email,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                preferredLang: dto.preferredLang ?? 'en',
                notes: dto.notes,
            },
        });

        await this.audit.log({
            clinicId: dto.clinicId,
            userId: requestingUser?.id,
            action: 'CREATE_PATIENT',
            entity: 'Patient',
            entityId: patient.id,
            newValues: { firstName: patient.firstName, phone: patient.phone },
        });

        return patient;
    }


    async findAllByClinic(clinicId: string) {
        return this.prisma.patient.findMany({
            where: { clinicId, isActive: true },
            orderBy: { lastName: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id, clinicId },
            include: {
                appointments: {
                    orderBy: { scheduledAt: 'desc' },
                    take: 10, // last 10 appointments only
                },
            },
        });

        if (!patient) {
            throw new NotFoundException(`Patient ${id} not found`);
        }

        return patient;
    }

    async search(clinicId: string, query: string) {
        return this.prisma.patient.findMany({
            where: {
                clinicId,
                isActive: true,
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                    { email: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { lastName: 'asc' },
        });
    }

    async update(id: string, clinicId: string, dto: UpdatePatientDto) {
        await this.findOne(id, clinicId); // throws if not found

        return this.prisma.patient.update({
            where: { id },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                email: dto.email,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                preferredLang: dto.preferredLang,
                notes: dto.notes,
            },
        });
    }

    // Soft delete only — appointments and reminder logs must stay intact
    async deactivate(id: string, clinicId: string, requestingUser?: any) {
        await this.findOne(id, clinicId);

        const patient = await this.prisma.patient.update({
            where: { id },
            data: { isActive: false },
        });

        await this.audit.log({
            clinicId,
            userId: requestingUser?.id,
            action: 'DEACTIVATE_PATIENT',
            entity: 'Patient',
            entityId: id,
        });

        return patient;
    }
}