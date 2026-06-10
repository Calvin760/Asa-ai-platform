// src/reminders/reminders.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderLogDto } from './dto/create-reminder-log.dto';
import { UpdateReminderStatusDto } from './dto/update-reminder-status.dto';
import { InboundReplyDto } from './dto/inbound-reply.dto';
import { ReminderStatus, ReplyIntent, AppointmentStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
    constructor(private readonly prisma: PrismaService) { }

    async createLog(dto: CreateReminderLogDto) {
        return this.prisma.reminderLog.create({
            data: {
                clinicId: dto.clinicId,
                appointmentId: dto.appointmentId,
                channel: dto.channel,
                messageBody: dto.messageBody,
                scheduledFor: new Date(dto.scheduledFor),
                agentRunId: dto.agentRunId,
            },
        });
    }

    async updateStatus(id: string, dto: UpdateReminderStatusDto) {
        const log = await this.prisma.reminderLog.findUnique({ where: { id } });

        if (!log) {
            throw new NotFoundException(`ReminderLog ${id} not found`);
        }

        return this.prisma.reminderLog.update({
            where: { id },
            data: {
                status: dto.status,
                providerMsgId: dto.providerMsgId,
                sentAt: dto.sentAt ? new Date(dto.sentAt) : undefined,
                deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
            },
        });
    }

    // Called by the inbound webhook when a patient replies
    async handleInboundReply(dto: InboundReplyDto) {
        // Find the most recent sent reminder for this phone number
        const log = await this.prisma.reminderLog.findFirst({
            where: {
                providerMsgId: dto.providerMsgId,
                status: { in: [ReminderStatus.SENT, ReminderStatus.DELIVERED] },
            },
            include: { appointment: true },
        });

        if (!log) {
            // No matching reminder — reply may be unsolicited, log and ignore
            return { handled: false, reason: 'No matching reminder log found' };
        }

        const intent = this.parseReplyIntent(dto.body);

        // Write the reply and intent back to the log
        await this.prisma.reminderLog.update({
            where: { id: log.id },
            data: {
                patientReply: dto.body,
                replyReceivedAt: new Date(),
                replyIntent: intent,
            },
        });

        // Update appointment status based on intent
        const statusMap: Partial<Record<ReplyIntent, AppointmentStatus>> = {
            [ReplyIntent.CONFIRMED]: AppointmentStatus.CONFIRMED,
            [ReplyIntent.CANCELLED]: AppointmentStatus.CANCELLED,
            [ReplyIntent.RESCHEDULE_REQUESTED]: AppointmentStatus.RESCHEDULED,
        };

        if (statusMap[intent]) {
            await this.prisma.appointment.update({
                where: { id: log.appointmentId },
                data: { status: statusMap[intent] },
            });
        }

        return { handled: true, intent, appointmentId: log.appointmentId };
    }

    async findByClinic(clinicId: string, limit = 50) {
        return this.prisma.reminderLog.findMany({
            where: { clinicId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                appointment: {
                    select: {
                        scheduledAt: true,
                        appointmentType: true,
                        patient: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async findByAppointment(appointmentId: string) {
        return this.prisma.reminderLog.findMany({
            where: { appointmentId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ----------------------------------------------------------------
    // Intent parser — pure function, no AI needed for simple replies
    // Handles English + common Afrikaans/Zulu confirmations for SA
    // ----------------------------------------------------------------
    private parseReplyIntent(body: string): ReplyIntent {
        const text = body.toLowerCase().trim();

        const confirmPatterns = [
            'yes', 'y', 'confirm', 'confirmed', 'ok', 'okay',
            'sure', 'will be there', 'see you', 'ja', 'yebo',
        ];

        const cancelPatterns = [
            'no', 'n', 'cancel', 'cancelled', 'cant make it',
            "can't make it", 'unable', 'nee',
        ];

        const reschedulePatterns = [
            'reschedule', 'change', 'different time',
            'another day', 'postpone', 'move',
        ];

        if (confirmPatterns.some((p) => text.includes(p))) {
            return ReplyIntent.CONFIRMED;
        }

        if (cancelPatterns.some((p) => text.includes(p))) {
            return ReplyIntent.CANCELLED;
        }

        if (reschedulePatterns.some((p) => text.includes(p))) {
            return ReplyIntent.RESCHEDULE_REQUESTED;
        }

        return ReplyIntent.UNCLEAR;
    }

    async updateByProviderMessageId(
        providerMsgId: string,
        data: {
            status?: any;
            deliveredAt?: string;
        },
    ) {
        return this.prisma.reminderLog.updateMany({
            where: {
                providerMsgId,
            },
            data: {
                status: data.status,
                deliveredAt: data.deliveredAt
                    ? new Date(data.deliveredAt)
                    : undefined,
            },
        });
    }
}