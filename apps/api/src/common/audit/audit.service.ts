// src/common/audit/audit.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
    clinicId?: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    async log(params: AuditLogParams) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    clinicId: params.clinicId,
                    userId: params.userId,
                    action: params.action,
                    entity: params.entity,
                    entityId: params.entityId,
                    oldValues: params.oldValues,
                    newValues: params.newValues,
                    ipAddress: params.ipAddress,
                    userAgent: params.userAgent,
                },
            });
        } catch (err) {
            // Audit logging should never crash the main flow
            console.error('Audit log failed:', err);
        }
    }

    async findByClinic(clinicId: string, limit = 50) {
        return this.prisma.auditLog.findMany({
            where: { clinicId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}