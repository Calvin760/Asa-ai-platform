// src/webhooks/webhooks.controller.ts

import {
    Controller,
    Post,
    Headers,
    Req,
    Body,
    BadRequestException,
    Logger,
    HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { RemindersService } from '../reminders/reminders.service';
import { MessagingService } from '../agent/messaging/messaging.service';
import { ConversationQueueService } from '../conversations/conversation-queue.service';
import { ReminderStatus, AppointmentStatus, ReplyIntent } from '@prisma/client';

@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly remindersService: RemindersService,
        private readonly messagingService: MessagingService,
        private readonly conversationQueue: ConversationQueueService,
    ) { }

    // ─────────────────────────────────────────────────────────────────────────
    // Twilio delivery status webhook
    //
    // Status ranking (never downgrade):
    //   PENDING(0) < SENT(1) < DELIVERED(2) < FAILED(3)
    //
    // Ignored statuses: queued, accepted, read, receiving, received, etc.
    // ─────────────────────────────────────────────────────────────────────────
    @Public()
    @Post('twilio/status')
    async handleTwilioStatus(@Body() body: any) {
        const { MessageSid, MessageStatus } = body;
        if (!MessageSid) return { received: true };

        this.logger.log(`Twilio status webhook: ${MessageSid} → ${MessageStatus}`);

        const statusMap: Record<string, ReminderStatus> = {
            sent: ReminderStatus.SENT,
            delivered: ReminderStatus.DELIVERED,
            failed: ReminderStatus.FAILED,
            undelivered: ReminderStatus.FAILED,
        };

        const mapped = statusMap[MessageStatus];
        if (!mapped) {
            // read, queued, accepted, etc — nothing to do
            return { received: true };
        }

        const log = await this.prisma.reminderLog.findFirst({
            where: { providerMsgId: MessageSid },
        });

        if (!log) {
            // This SID belongs to a conversation agent message, not a reminder — ignore silently
            this.logger.debug(`No reminder log for SID ${MessageSid} — likely a conversation message`);
            return { received: true };
        }

        // Never downgrade status
        const rank: Record<string, number> = {
            PENDING: 0, SENT: 1, DELIVERED: 2, FAILED: 3, SKIPPED: 4,
        };
        if ((rank[log.status] ?? 0) >= (rank[mapped] ?? 0)) {
            this.logger.log(`Skipping downgrade: ${log.status} → ${mapped}`);
            return { received: true };
        }

        await this.remindersService.updateStatus(log.id, {
            status: mapped,
            deliveredAt: mapped === ReminderStatus.DELIVERED ? new Date().toISOString() : undefined,
        });

        this.logger.log(`Updated reminder ${MessageSid} → ${mapped}`);
        return { received: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Twilio inbound message webhook
    //
    // Routing:
    // 1. YES/NO/RESCHEDULE to a recent reminder → handle directly, reply, done
    // 2. Everything else → conversation booking agent (async queue)
    // ─────────────────────────────────────────────────────────────────────────
    @Public()
    @Post('twilio/inbound')
    @HttpCode(202)
    async handleTwilioInbound(@Body() body: any) {
        const { From, To, Body: messageBody, MessageSid } = body;

        if (!From || !messageBody) {
            this.logger.warn('[WEBHOOK] Incomplete payload');
            return { received: true };
        }

        const patientPhone = From.replace('whatsapp:', '').replace('sms:', '');
        this.logger.log(`[WEBHOOK] Inbound from ${From}, MessageSid: ${MessageSid}`);

        // Look up clinic by the Twilio number the message was sent TO.
        // Each clinic has its own Twilio WhatsApp number so this is always unambiguous.
        // A patient registered at two clinics messages each clinic's separate number —
        // their records remain independent per clinic.
        const clinic = await this.prisma.clinic.findFirst({
            where: { twilioWhatsAppNumber: To, isActive: true },
        });

        if (!clinic) {
            this.logger.warn(`[WEBHOOK] No clinic configured for Twilio number ${To}`);
            return { received: true };
        }

        this.logger.log(`[WEBHOOK] Routed to clinic ${clinic.id}`);

        // ── Step 1: Only try reminder reply if patient has NO active booking session ─
        // If a patient is mid-conversation with the booking agent (status not
        // STARTED/CONFIRMED/EXPIRED), route to the agent — don't intercept as
        // a reminder reply. This prevents "yes" during booking from triggering
        // appointment confirmation from a reminder.
        const activeSession = await this.prisma.conversationSession.findFirst({
            where: {
                clinicId: clinic.id,
                patientPhone,
                status: {
                    in: ['IDENTIFYING', 'IDENTIFIED', 'COLLECTING_DETAILS', 'PRESENTING_SLOTS', 'AWAITING_CONFIRMATION'],
                },
                expiresAt: { gt: new Date() },
            },
        });

        if (!activeSession) {
            // No active booking session — safe to check for reminder reply
            const reminderResult = await this.tryHandleReminderReply(clinic.id, patientPhone, messageBody);
            if (reminderResult.handled) {
                this.logger.log(`[WEBHOOK] Handled as reminder reply → ${reminderResult.intent}`);
                return { received: true, type: 'reminder_reply', intent: reminderResult.intent };
            }
        } else {
            this.logger.log(`[WEBHOOK] Active booking session found (${activeSession.status}) — skipping reminder reply check`);
        }

        // ── Step 2: Route to conversation booking agent ───────────────────────
        try {
            const jobId = await this.conversationQueue.queueConversationMessage({
                clinicId: clinic.id,
                patientPhone,
                messageBody,
                messageId: MessageSid,
            });

            this.logger.log(`[WEBHOOK] ✅ Queued job ${jobId} for ${patientPhone}`);
            return { received: true, queued: true, jobId };
        } catch (err: any) {
            this.logger.error(`[WEBHOOK] Queue failed: ${err.message}`);
            return { received: true, queued: false };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reminder reply handler
    //
    // Checks for a SENT/DELIVERED reminder for this phone in the last 48h.
    // If found and the message is a clear YES/NO/RESCHEDULE:
    //   - Updates the reminder log with the reply and intent
    //   - Updates the appointment status
    //   - Sends a confirmation back to the patient
    // ─────────────────────────────────────────────────────────────────────────
    private async tryHandleReminderReply(
        clinicId: string,
        patientPhone: string,
        messageBody: string,
    ): Promise<{ handled: boolean; intent?: ReplyIntent }> {
        const intent = this.parseIntent(messageBody);
        if (intent === ReplyIntent.UNCLEAR) return { handled: false };

        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const log = await this.prisma.reminderLog.findFirst({
            where: {
                clinicId,
                status: { in: [ReminderStatus.SENT, ReminderStatus.DELIVERED] },
                createdAt: { gte: cutoff },
                appointment: {
                    patient: { phone: patientPhone },
                },
            },
            include: {
                appointment: {
                    include: {
                        patient: { select: { firstName: true, phone: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!log) {
            this.logger.log(`[REMINDER_REPLY] No recent reminder for ${patientPhone}`);
            return { handled: false };
        }

        this.logger.log(
            `[REMINDER_REPLY] Matched log ${log.id} → appointment ${log.appointmentId} → intent: ${intent}`,
        );

        // Update reminder log
        await this.prisma.reminderLog.update({
            where: { id: log.id },
            data: {
                patientReply: messageBody,
                replyReceivedAt: new Date(),
                replyIntent: intent,
            },
        });

        // Update appointment status
        const apptStatusMap: Partial<Record<ReplyIntent, AppointmentStatus>> = {
            [ReplyIntent.CONFIRMED]: AppointmentStatus.CONFIRMED,
            [ReplyIntent.CANCELLED]: AppointmentStatus.CANCELLED,
            [ReplyIntent.RESCHEDULE_REQUESTED]: AppointmentStatus.RESCHEDULED,
        };

        const newStatus = apptStatusMap[intent];
        if (newStatus) {
            await this.prisma.appointment.update({
                where: { id: log.appointmentId },
                data: { status: newStatus },
            });
            this.logger.log(`[REMINDER_REPLY] ✅ Appointment ${log.appointmentId} → ${newStatus}`);
        }

        // Send reply back to patient
        await this.sendReminderReply(intent, patientPhone, log);

        return { handled: true, intent };
    }

    private async sendReminderReply(
        intent: ReplyIntent,
        patientPhone: string,
        log: any,
    ): Promise<void> {
        try {
            const patient = log.appointment.patient;
            const apptTime = new Date(log.appointment.scheduledAt).toLocaleString('en-ZA', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Johannesburg',
            });

            const messages: Record<ReplyIntent, string> = {
                [ReplyIntent.CONFIRMED]:
                    `✅ Got it, ${patient.firstName}! Your ${log.appointment.appointmentType.toLowerCase()} on ${apptTime} is confirmed. See you then!`,
                [ReplyIntent.CANCELLED]:
                    `Your ${log.appointment.appointmentType.toLowerCase()} on ${apptTime} has been cancelled. Call us to rebook anytime.`,
                [ReplyIntent.RESCHEDULE_REQUESTED]:
                    `We'll contact you shortly to find a new time for your ${log.appointment.appointmentType.toLowerCase()} appointment.`,
                [ReplyIntent.UNCLEAR]:
                    `Thanks for your message. Please reply YES to confirm or NO to cancel your appointment.`,
            };

            await this.messagingService.sendWhatsApp(patientPhone, messages[intent]);
            this.logger.log(`[REMINDER_REPLY] Sent ${intent} reply to ${patientPhone}`);
        } catch (err: any) {
            this.logger.error(`[REMINDER_REPLY] Failed to send reply: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Intent parser
    // ─────────────────────────────────────────────────────────────────────────
    private parseIntent(body: string): ReplyIntent {
        const t = body.toLowerCase().trim();

        const confirm = ['yes', 'y', 'confirm', 'confirmed', 'ok', 'okay', 'sure', 'will be there', 'see you', 'ja', 'yebo', '1'];
        const cancel = ['no', 'n', 'cancel', 'cancelled', "can't make it", 'cant make it', 'unable', 'nee', '2'];
        const reschedule = ['reschedule', 'change', 'different time', 'another day', 'postpone', 'move', '3'];

        if (confirm.some((p) => t === p || (p.length > 2 && t.includes(p)))) return ReplyIntent.CONFIRMED;
        if (cancel.some((p) => t === p || (p.length > 2 && t.includes(p)))) return ReplyIntent.CANCELLED;
        if (reschedule.some((p) => t.includes(p))) return ReplyIntent.RESCHEDULE_REQUESTED;

        return ReplyIntent.UNCLEAR;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Clerk user sync webhook
    // ─────────────────────────────────────────────────────────────────────────
    @Public()
    @Post('clerk')
    async handleClerkWebhook(
        @Headers('svix-id') svixId: string,
        @Headers('svix-timestamp') svixTimestamp: string,
        @Headers('svix-signature') svixSignature: string,
        @Req() req: Request,
    ) {
        const secret = process.env.CLERK_WEBHOOK_SECRET;
        if (!secret) throw new BadRequestException('Webhook secret not configured');

        const wh = new Webhook(secret);
        let event: any;

        try {
            event = wh.verify(JSON.stringify(req.body), {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            });
        } catch {
            throw new BadRequestException('Invalid webhook signature');
        }

        const { type, data } = event;
        this.logger.log(`Clerk webhook: ${type}`);

        if (type === 'user.created') {
            const email = data.email_addresses?.[0]?.email_address;
            if (!email) return { received: true };
            const existing = await this.prisma.user.findUnique({ where: { email } });
            if (existing) {
                if (!existing.clerkUserId) {
                    await this.prisma.user.update({ where: { email }, data: { clerkUserId: data.id } });
                }
            } else {
                await this.prisma.user.create({
                    data: { email, clerkUserId: data.id, firstName: data.first_name ?? null, lastName: data.last_name ?? null },
                });
            }
            this.logger.log(`Clerk user synced: ${email}`);
        }

        if (type === 'user.deleted') {
            await this.prisma.user.updateMany({ where: { clerkUserId: data.id }, data: { isActive: false } });
        }

        return { received: true };
    }
}