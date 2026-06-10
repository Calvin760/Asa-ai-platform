// src/appointments/appointments.service.ts

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';

@Injectable()
export class AppointmentsService {

    private readonly logger = new Logger(AppointmentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreateAppointmentDto, requestingUser?: any) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patientId, clinicId: dto.clinicId, isActive: true },
        });

        if (!patient) {
            throw new NotFoundException(
                `Patient ${dto.patientId} not found in this clinic`,
            );
        }

        if (dto.dentistId) {
            const dentist = await this.prisma.user.findFirst({
                where: { id: dto.dentistId, clinicId: dto.clinicId, isActive: true },
            });

            if (!dentist) {
                throw new NotFoundException(
                    `Dentist ${dto.dentistId} not found in this clinic`,
                );
            }
        }

        if (dto.dentistId) {
            const clash = await this.prisma.appointment.findFirst({
                where: {
                    clinicId: dto.clinicId,
                    dentistId: dto.dentistId,
                    scheduledAt: new Date(dto.scheduledAt),
                    status: {
                        notIn: [
                            AppointmentStatus.CANCELLED,
                            AppointmentStatus.NO_SHOW,
                        ],
                    },
                },
            });

            if (clash) {
                throw new BadRequestException(
                    `Dentist already has an appointment at ${dto.scheduledAt}`,
                );
            }
        }

        const appointment = await this.prisma.appointment.create({
            data: {
                clinicId: dto.clinicId,
                patientId: dto.patientId,
                dentistId: dto.dentistId,
                appointmentType: dto.appointmentType,
                scheduledAt: new Date(dto.scheduledAt),
                durationMins: dto.durationMins ?? 30,
                notes: dto.notes,
            },
            include: { patient: true, dentist: true },
        });

        await this.audit.log({
            clinicId: dto.clinicId,
            userId: requestingUser?.id,
            action: 'CREATE_APPOINTMENT',
            entity: 'Appointment',
            entityId: appointment.id,
            newValues: {
                patientId: dto.patientId,
                appointmentType: dto.appointmentType,
                scheduledAt: dto.scheduledAt,
            },
        });

        return appointment;
    }

    async findAllByClinic(
        clinicId: string,
        filters?: {
            date?: string;
            status?: AppointmentStatus;
            dentistId?: string;
        },
    ) {
        const where: any = { clinicId };

        if (filters?.status) where.status = filters.status;
        if (filters?.dentistId) where.dentistId = filters.dentistId;

        if (filters?.date) {
            const start = new Date(filters.date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.date);
            end.setHours(23, 59, 59, 999);
            where.scheduledAt = { gte: start, lte: end };
        }

        return this.prisma.appointment.findMany({
            where,
            orderBy: { scheduledAt: 'asc' },
            include: {
                patient: {
                    select: { id: true, firstName: true, lastName: true, phone: true },
                },
                dentist: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    async findUpcomingWithoutReminder(clinicId: string, withinHours: number = 48) {
        const now = new Date();
        const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

        return this.prisma.appointment.findMany({
            where: {
                clinicId,
                status: AppointmentStatus.SCHEDULED,
                scheduledAt: { gte: now, lte: cutoff },
                reminderLogs: {
                    none: { status: { in: ['SENT', 'DELIVERED'] } },
                },
            },
            include: {
                patient: {
                    select: { id: true, firstName: true, phone: true, preferredLang: true },
                },
            },
            orderBy: { scheduledAt: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        const appointment = await this.prisma.appointment.findFirst({
            where: { id, clinicId },
            include: {
                patient: true,
                dentist: true,
                reminderLogs: { orderBy: { createdAt: 'desc' } },
            },
        });

        if (!appointment) {
            throw new NotFoundException(`Appointment ${id} not found`);
        }

        return appointment;
    }

    async update(id: string, clinicId: string, dto: UpdateAppointmentDto, requestingUser?: any) {
        const existing = await this.findOne(id, clinicId);

        const appointment = await this.prisma.appointment.update({
            where: { id },
            data: {
                dentistId: dto.dentistId,
                appointmentType: dto.appointmentType,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
                durationMins: dto.durationMins,
                notes: dto.notes,
            },
            include: { patient: true, dentist: true },
        });

        await this.audit.log({
            clinicId,
            userId: requestingUser?.id,
            action: 'UPDATE_APPOINTMENT',
            entity: 'Appointment',
            entityId: id,
            oldValues: { appointmentType: existing.appointmentType, scheduledAt: existing.scheduledAt },
            newValues: { appointmentType: dto.appointmentType, scheduledAt: dto.scheduledAt },
        });

        return appointment;
    }

    async updateStatus(id: string, clinicId: string, dto: UpdateAppointmentStatusDto, requestingUser?: any) {
        const existing = await this.findOne(id, clinicId);

        const appointment = await this.prisma.appointment.update({
            where: { id },
            data: { status: dto.status },
        });

        await this.audit.log({
            clinicId,
            userId: requestingUser?.id,
            action: 'UPDATE_APPOINTMENT_STATUS',
            entity: 'Appointment',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: dto.status },
        });

        return appointment;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION AGENT METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Find real available slots from the database.
     * Checks ALL booked appointments (any type) to avoid any overlap.
     * Called exclusively by the conversation booking agent.
     */
    async findAvailableSlots(
        clinicId: string,
        _appointmentType: string, // kept for API compatibility — not filtered so we catch all conflicts
        daysAhead: number = 14,
        durationMins: number = 30,
    ): Promise<Array<{ start: Date; end: Date }>> {
        this.logger.log(
            `[SLOTS] Finding available slots, next ${daysAhead} days, duration ${durationMins}min`,
        );

        const now = new Date();

        const fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() + 1);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + daysAhead);

        // Fetch every booked appointment in the range regardless of type
        const booked = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                scheduledAt: { gte: fromDate, lte: toDate },
                status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
            },
            select: { scheduledAt: true, durationMins: true },
        });

        this.logger.log(`[SLOTS] Found ${booked.length} existing bookings in range`);

        const clinicStart = 9;
        const clinicEnd = 17;
        const slotStep = 30;

        const slots: Array<{ start: Date; end: Date }> = [];

        for (const d = new Date(fromDate); d < toDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

            for (let hour = clinicStart; hour < clinicEnd; hour++) {
                for (let min = 0; min < 60; min += slotStep) {
                    const slotStart = new Date(d);
                    slotStart.setHours(hour, min, 0, 0);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + durationMins);

                    if (slotEnd.getHours() > clinicEnd) continue; // past close

                    const clash = booked.some((appt) => {
                        const apptEnd = new Date(
                            appt.scheduledAt.getTime() + appt.durationMins * 60 * 1000,
                        );
                        return slotStart < apptEnd && slotEnd > appt.scheduledAt;
                    });

                    if (!clash) slots.push({ start: slotStart, end: slotEnd });
                }
            }
        }

        this.logger.log(`[SLOTS] ✅ Returning ${slots.length} available slots`);
        this.logger.log(`[DEBUG] system now: ${new Date().toISOString()}`);
        this.logger.log(`[DEBUG] fromDate: ${fromDate.toISOString()}`);
        this.logger.log(`[DEBUG] toDate: ${toDate.toISOString()}`);
        return slots;
    }

    /**
     * Create an appointment from the conversation agent.
     * Routes through create() so the double-booking guard and audit log both run.
     */
    async createFromAgent(
        clinicId: string,
        patientId: string,
        appointmentType: AppointmentType,
        scheduledAt: Date,
        durationMins: number,
        notes?: string,
    ) {
        return this.create(
            {
                clinicId,
                patientId,
                appointmentType,
                scheduledAt: scheduledAt.toISOString(),
                durationMins,
                notes,
            },
            undefined,
        );
    }
}