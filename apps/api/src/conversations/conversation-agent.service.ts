/**
 * src/conversations/conversation-agent.service.ts
 *
 * Features:
 * 1.  Patient creation     — via PatientsService (duplicate check + audit)
 * 2.  Appointment booking  — slot check + createFromAgent
 * 3.  Cancellation         — by phone lookup or appointmentId
 * 4.  Rescheduling         — clash check + update
 * 5.  YES/NO replies       — confirmation / cancel via reminder reply
 * 6.  Knowledge base       — clinic FAQ / policies lookup
 * 7.  Waitlist             — register when no slots available
 * 8.  Daily report         — today's stats summary
 * 9.  Patient appointments — look up upcoming bookings
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from './conversations.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PatientsService } from '../patients/patients.service';
import { MessagingService } from '../agent/messaging/messaging.service';
import { LLMMessage, LLMRouterService } from 'src/llm';
import {
    ConversationStatus,
    AppointmentType,
    AppointmentStatus,
    WaitlistStatus,
} from '@prisma/client';

@Injectable()
export class ConversationAgentService {
    private readonly logger = new Logger(ConversationAgentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationsService: ConversationsService,
        private readonly appointmentsService: AppointmentsService,
        private readonly patientsService: PatientsService,
        private readonly messagingService: MessagingService,
        private readonly llmRouter: LLMRouterService,
    ) { }

    // ─────────────────────────────────────────────────────────────────────────
    // ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    async handleInboundMessage(
        clinicId: string,
        patientPhone: string,
        messageBody: string,
    ): Promise<string> {
        this.logger.log(`[AGENT] ${patientPhone} -> "${messageBody.substring(0, 60)}"`);

        try {
            const session = await this.conversationsService.getOrCreateSession(
                clinicId,
                patientPhone,
            );

            this.logger.log(`[AGENT] Session ${session.id} (${session.status})`);

            await this.conversationsService.saveMessage(session.id, 'user', messageBody);

            const response = await this.runAgent(session.id, clinicId);

            await this.conversationsService.saveMessage(session.id, 'assistant', response);
            await this.messagingService.sendWhatsApp(patientPhone, response);

            this.logger.log(`[AGENT] Replied to ${patientPhone}`);
            return response;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[AGENT] Failed: ${msg}`);
            throw err;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT LOOP
    // ─────────────────────────────────────────────────────────────────────────

    private async runAgent(sessionId: string, clinicId: string): Promise<string> {
        const session = await this.conversationsService.getSessionWithHistory(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const clinic = await this.conversationsService.getClinicInfo(clinicId);
        const ctx = (session.sessionContext || {}) as Record<string, any>;

        // Load knowledge base into system prompt
        const kb = await this.prisma.knowledgeEntry.findMany({
            where: { clinicId, isActive: true },
            select: { question: true, answer: true },
            take: 20,
        });
        const kbText = kb.length
            ? kb.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n')
            : 'No knowledge base entries configured.';

        const messages: LLMMessage[] = session.messageHistory.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        // Inject today so the LLM never uses stale training-data years
        const todayFormatted = new Date().toLocaleDateString('en-ZA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Africa/Johannesburg',
        });

        const systemPrompt = `You are the AI assistant for ${clinic?.name || 'our dental clinic'}.
You communicate with patients via WhatsApp for bookings, cancellations, rescheduling, and questions.

TODAY IS: ${todayFormatted}
CRITICAL: All appointment times come from the getAvailableSlots tool which returns real future dates.
You MUST pass the exact ISO datetime from the tool result into confirmAppointment — never invent or modify dates.
Always state the full date including year when confirming a booking.

PATIENT CONTEXT:
- Phone: ${session.patientPhone}
- Identified: ${session.patientId ? 'YES (ID: ' + session.patientId + ')' : 'NO'}
- Name: ${ctx.patientName || 'NOT YET COLLECTED'}
- Appointment type: ${ctx.appointmentType || 'NOT YET COLLECTED'}
- Session status: ${session.status}

CLINIC KNOWLEDGE BASE:
${kbText}

MANDATORY RULES:
1. Always collect the patient name first if not yet known.
2. Detect patient INTENT:
   - booking / schedule / appointment    -> booking flow
   - cancel / cancellation               -> cancelAppointment
   - reschedule / change / move          -> reschedule flow (call getAvailableSlots first)
   - waitlist / waiting list             -> addToWaitlist
   - report / stats / daily              -> getDailyReport
   - questions about clinic              -> answer from knowledge base above
3. NEVER present appointment times without calling getAvailableSlots first.
   Use the exact ISO value from the tool result in confirmAppointment.
4. NEVER say "booked" without a successful confirmAppointment tool response.
5. Keep all replies under 160 characters.
6. Respond in the patient's language if detectable.`;

        let finalResponse = '';
        const MAX = 10;

        for (let i = 0; i < MAX; i++) {
            this.logger.log(`[AGENT] Iteration ${i + 1}/${MAX}`);

            const response = await this.llmRouter.call({
                messages,
                systemPrompt,
                tools: this.buildTools(),
                maxTokens: 1024,
            });

            this.logger.log(`[AGENT] Provider: ${response.provider} | stop: ${response.stopReason}`);

            for (const block of response.content) {
                if (block.type === 'text') finalResponse = block.text || '';
            }

            messages.push({ role: 'assistant', content: response.content as any });
            if (response.stopReason === 'end_turn') break;

            const toolResults: any[] = [];
            let hasTools = false;

            for (const block of response.content) {
                if (block.type !== 'tool_use') continue;
                hasTools = true;

                this.logger.log(`[AGENT] -> ${block.name}`);

                let result: any;
                try {
                    result = await this.runTool(
                        block.name || '',
                        (block.input || {}) as Record<string, any>,
                        sessionId,
                        clinicId,
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.error(`[AGENT] Tool error: ${msg}`);
                    result = { success: false, error: msg };
                }

                this.logger.log(`[AGENT] <- ${JSON.stringify(result).substring(0, 120)}`);

                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: JSON.stringify(result),
                });
            }

            if (!hasTools) break;
            messages.push({ role: 'user', content: toolResults });
        }

        return finalResponse || 'Sorry, something went wrong. Please try again.';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOOL DEFINITIONS
    // ─────────────────────────────────────────────────────────────────────────

    private buildTools() {
        const apptTypeEnum = Object.values(AppointmentType);

        return [
            {
                name: 'getAvailableSlots',
                description: 'Fetch real available appointment slots from the database. MUST be called before presenting times. Each slot has a slotISO field. You MUST pass slotISO (not displayLabel) directly into confirmAppointment slotStart. Never modify or reconstruct the date.',
                input_schema: {
                    type: 'object',
                    properties: {
                        appointmentType: { type: 'string', enum: apptTypeEnum },
                        daysAhead: { type: 'number', default: 14 },
                        durationMins: { type: 'number', default: 30 },
                    },
                    required: ['appointmentType'],
                },
            },
            {
                name: 'createPatient',
                description: 'Register a new patient. Checks for duplicates automatically.',
                input_schema: {
                    type: 'object',
                    properties: {
                        firstName: { type: 'string' },
                        lastName: { type: 'string', default: '' },
                        phone: { type: 'string' },
                        preferredLang: { type: 'string', default: 'en' },
                    },
                    required: ['firstName', 'phone'],
                },
            },
            {
                name: 'confirmAppointment',
                description: 'Book an appointment after patient selects a slot from getAvailableSlots.',
                input_schema: {
                    type: 'object',
                    properties: {
                        appointmentType: { type: 'string', enum: apptTypeEnum },
                        slotStart: { type: 'string', description: 'ISO 8601 datetime' },
                        durationMins: { type: 'number', default: 30 },
                        patientName: { type: 'string' },
                        patientNotes: { type: 'string' },
                    },
                    required: ['appointmentType', 'slotStart', 'durationMins', 'patientName'],
                },
            },
            {
                name: 'cancelAppointment',
                description: 'Cancel a patient appointment. Looks up by patient phone if no ID provided.',
                input_schema: {
                    type: 'object',
                    properties: {
                        appointmentId: { type: 'string', description: 'Appointment ID if known' },
                        reason: { type: 'string' },
                    },
                    required: [],
                },
            },
            {
                name: 'rescheduleAppointment',
                description: 'Reschedule an existing appointment. Call getAvailableSlots first.',
                input_schema: {
                    type: 'object',
                    properties: {
                        appointmentId: { type: 'string' },
                        newSlotStart: { type: 'string', description: 'ISO 8601 datetime' },
                    },
                    required: ['newSlotStart'],
                },
            },
            {
                name: 'handleConfirmationReply',
                description: 'Process a YES/NO/RESCHEDULE reply to an appointment reminder.',
                input_schema: {
                    type: 'object',
                    properties: {
                        intent: { type: 'string', enum: ['CONFIRMED', 'CANCELLED', 'RESCHEDULE_REQUESTED'] },
                        appointmentId: { type: 'string', description: 'Appointment ID to act on if known' },
                    },
                    required: ['intent'],
                },
            },
            {
                name: 'addToWaitlist',
                description: 'Add patient to waitlist when no slots are available.',
                input_schema: {
                    type: 'object',
                    properties: {
                        appointmentType: { type: 'string', enum: apptTypeEnum },
                        patientName: { type: 'string' },
                        preferredDays: {
                            type: 'array',
                            items: { type: 'string', enum: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
                        },
                        preferredTime: { type: 'string', enum: ['morning', 'afternoon', 'any'], default: 'any' },
                        notes: { type: 'string' },
                    },
                    required: ['appointmentType', 'patientName'],
                },
            },
            {
                name: 'getDailyReport',
                description: 'Get a daily summary: appointments, cancellations, no-shows, reminders sent.',
                input_schema: {
                    type: 'object',
                    properties: {
                        date: { type: 'string', description: 'ISO date YYYY-MM-DD, defaults to today' },
                    },
                    required: [],
                },
            },
            {
                name: 'getPatientAppointments',
                description: "Look up the current patient's upcoming (or past) appointments.",
                input_schema: {
                    type: 'object',
                    properties: {
                        includeHistory: { type: 'boolean', default: false },
                    },
                    required: [],
                },
            },
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOOL ROUTER
    // ─────────────────────────────────────────────────────────────────────────

    private async runTool(
        name: string,
        input: Record<string, any>,
        sessionId: string,
        clinicId: string,
    ): Promise<any> {
        switch (name) {
            case 'getAvailableSlots':       return this.toolGetSlots(input, sessionId, clinicId);
            case 'createPatient':           return this.toolCreatePatient(input, sessionId, clinicId);
            case 'confirmAppointment':      return this.toolConfirm(input, sessionId, clinicId);
            case 'cancelAppointment':       return this.toolCancel(input, sessionId, clinicId);
            case 'rescheduleAppointment':   return this.toolReschedule(input, sessionId, clinicId);
            case 'handleConfirmationReply': return this.toolConfirmReply(input, sessionId, clinicId);
            case 'addToWaitlist':           return this.toolWaitlist(input, sessionId, clinicId);
            case 'getDailyReport':          return this.toolDailyReport(input, clinicId);
            case 'getPatientAppointments':  return this.toolGetAppointments(input, sessionId, clinicId);
            default:
                return { success: false, error: `Unknown tool: ${name}` };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOOL IMPLEMENTATIONS
    // ─────────────────────────────────────────────────────────────────────────

    private async toolGetSlots(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const slots = await this.appointmentsService.findAvailableSlots(
                clinicId, input.appointmentType, input.daysAhead ?? 14, input.durationMins ?? 30,
            );
            this.logger.log(`[SLOTS] Found ${slots.length} real slots`);
            await this.conversationsService.updateContext(sessionId, { appointmentType: input.appointmentType });
            await this.conversationsService.updateStatus(sessionId, ConversationStatus.PRESENTING_SLOTS);
            if (slots.length === 0) {
                return { success: true, totalAvailable: 0, slots: [], message: 'No slots available in the next ' + (input.daysAhead ?? 14) + ' days.' };
            }
            return {
                success: true,
                appointmentType: input.appointmentType,
                totalAvailable: slots.length,
                slots: slots.slice(0, 5).map((s) => ({
                    slotISO: s.start.toISOString(),
                    displayLabel: s.start.toLocaleString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }),
                })),
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolCreatePatient(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const existing = await this.prisma.patient.findFirst({
                where: { clinicId, phone: input.phone, isActive: true },
            });
            if (existing) {
                await this.conversationsService.linkPatient(sessionId, existing.id);
                await this.conversationsService.updateContext(sessionId, { patientName: `${existing.firstName} ${existing.lastName}`.trim() });
                return { success: true, action: 'found_existing', patientId: existing.id, patientName: `${existing.firstName} ${existing.lastName}`.trim() };
            }
            const patient = await this.patientsService.create({
                clinicId, firstName: input.firstName, lastName: input.lastName || '',
                phone: input.phone, preferredLang: input.preferredLang || 'en',
            });
            await this.conversationsService.linkPatient(sessionId, patient.id);
            await this.conversationsService.updateContext(sessionId, { patientName: `${patient.firstName} ${patient.lastName}`.trim() });
            this.logger.log(`[PATIENT] Created ${patient.id}`);
            return { success: true, action: 'created', patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}`.trim() };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolConfirm(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            let patient = session.patientId
                ? await this.prisma.patient.findUnique({ where: { id: session.patientId } })
                : await this.conversationsService.findPatientByPhone(clinicId, session.patientPhone);

            if (!patient) {
                const created = await this.toolCreatePatient(
                    { firstName: (input.patientName || 'Patient').split(' ')[0], lastName: (input.patientName || '').split(' ').slice(1).join(' '), phone: session.patientPhone },
                    sessionId, clinicId,
                );
                if (!created.success) return created;
                patient = await this.prisma.patient.findUnique({ where: { id: created.patientId } });
                if (!patient) throw new Error('Patient creation failed');
            }

            const scheduledAt = new Date(input.slotStart);
            const slotEnd = new Date(scheduledAt.getTime() + (input.durationMins ?? 30) * 60 * 1000);
            const clash = await this.prisma.appointment.findFirst({
                where: { clinicId, scheduledAt: { gte: scheduledAt, lt: slotEnd }, status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] } },
            });
            if (clash) return { success: false, error: 'That slot was just taken. Please choose another time.' };

            const appointment = await this.appointmentsService.createFromAgent(
                clinicId, patient.id, input.appointmentType as AppointmentType, scheduledAt, input.durationMins ?? 30, input.patientNotes,
            );
            const check = await this.prisma.appointment.findUnique({ where: { id: appointment.id } });
            if (!check) throw new Error(`Appointment ${appointment.id} not found after write`);

            await this.conversationsService.updateContext(sessionId, { confirmedAppointmentId: appointment.id });
            await this.conversationsService.updateStatus(sessionId, ConversationStatus.CONFIRMED);
            this.logger.log(`[BOOK] Appointment created: ${appointment.id}`);

            // Only expose the human-readable format — not the raw ISO —
            // so the LLM uses the correct SAST time in its confirmation message
            return {
                success: true,
                appointmentId: appointment.id,
                patientName: patient.firstName,
                appointmentType: appointment.appointmentType,
                scheduledAtFormatted: scheduledAt.toLocaleString('en-ZA', {
                    weekday: 'long', day: 'numeric', month: 'long',
                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                    timeZone: 'Africa/Johannesburg',
                }),
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[BOOK] ${msg}`);
            return { success: false, error: msg };
        }
    }

    private async toolCancel(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            let appointment: any;
            if (input.appointmentId) {
                appointment = await this.prisma.appointment.findFirst({ where: { id: input.appointmentId, clinicId } });
            } else {
                const patient = session.patientId
                    ? await this.prisma.patient.findUnique({ where: { id: session.patientId } })
                    : await this.conversationsService.findPatientByPhone(clinicId, session.patientPhone);
                if (!patient) return { success: false, error: 'No patient record found for this number' };
                appointment = await this.prisma.appointment.findFirst({
                    where: { clinicId, patientId: patient.id, scheduledAt: { gte: new Date() }, status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] } },
                    orderBy: { scheduledAt: 'asc' },
                });
            }

            if (!appointment) return { success: false, error: 'No upcoming appointment found to cancel' };

            await this.prisma.appointment.update({
                where: { id: appointment.id },
                data: {
                    status: AppointmentStatus.CANCELLED,
                    notes: [appointment.notes, `Cancelled via WhatsApp: ${input.reason || 'No reason given'}`].filter(Boolean).join(' | '),
                },
            });
            this.logger.log(`[CANCEL] ${appointment.id} cancelled`);
            return { success: true, appointmentId: appointment.id, cancelledAt: new Date().toISOString(), scheduledWas: appointment.scheduledAt.toISOString() };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolReschedule(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            let appointment: any;
            if (input.appointmentId) {
                appointment = await this.prisma.appointment.findFirst({ where: { id: input.appointmentId, clinicId } });
            } else {
                const patient = session.patientId
                    ? await this.prisma.patient.findUnique({ where: { id: session.patientId } })
                    : await this.conversationsService.findPatientByPhone(clinicId, session.patientPhone);
                if (!patient) return { success: false, error: 'No patient found for this number' };
                appointment = await this.prisma.appointment.findFirst({
                    where: { clinicId, patientId: patient.id, scheduledAt: { gte: new Date() }, status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] } },
                    orderBy: { scheduledAt: 'asc' },
                });
            }

            if (!appointment) return { success: false, error: 'No upcoming appointment found to reschedule' };

            const newSlot = new Date(input.newSlotStart);
            const clash = await this.prisma.appointment.findFirst({
                where: {
                    clinicId,
                    id: { not: appointment.id },
                    scheduledAt: { gte: newSlot, lt: new Date(newSlot.getTime() + appointment.durationMins * 60 * 1000) },
                    status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
                },
            });
            if (clash) return { success: false, error: 'That slot is not available. Choose a different time.' };

            const updated = await this.prisma.appointment.update({
                where: { id: appointment.id },
                data: { scheduledAt: newSlot, status: AppointmentStatus.RESCHEDULED },
            });
            await this.conversationsService.updateContext(sessionId, { confirmedAppointmentId: updated.id });
            this.logger.log(`[RESCHEDULE] ${appointment.id} -> ${input.newSlotStart}`);

            return {
                success: true,
                appointmentId: updated.id,
                oldScheduledAt: appointment.scheduledAt.toISOString(),
                newScheduledAt: updated.scheduledAt.toISOString(),
                newScheduledAtFormatted: newSlot.toLocaleString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }),
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolConfirmReply(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            const patient = session.patientId
                ? await this.prisma.patient.findUnique({ where: { id: session.patientId } })
                : await this.conversationsService.findPatientByPhone(clinicId, session.patientPhone);
            if (!patient) return { success: false, error: 'No patient record found for this number' };

            let appointment: any;
            if (input.appointmentId) {
                appointment = await this.prisma.appointment.findFirst({ where: { id: input.appointmentId, clinicId } });
            } else {
                appointment = await this.prisma.appointment.findFirst({
                    where: { clinicId, patientId: patient.id, scheduledAt: { gte: new Date() }, status: AppointmentStatus.SCHEDULED },
                    orderBy: { scheduledAt: 'asc' },
                });
            }
            if (!appointment) return { success: false, error: 'No pending appointment found to act on' };

            const statusMap: Record<string, AppointmentStatus> = {
                CONFIRMED: AppointmentStatus.CONFIRMED,
                CANCELLED: AppointmentStatus.CANCELLED,
                RESCHEDULE_REQUESTED: AppointmentStatus.RESCHEDULED,
            };
            const newStatus = statusMap[input.intent];
            if (!newStatus) return { success: false, error: `Unknown intent: ${input.intent}` };

            await this.prisma.appointment.update({ where: { id: appointment.id }, data: { status: newStatus } });
            await this.prisma.reminderLog.updateMany({
                where: { appointmentId: appointment.id, status: { in: ['SENT', 'DELIVERED'] as any } },
                data: { patientReply: input.intent, replyReceivedAt: new Date(), replyIntent: input.intent as any },
            });
            this.logger.log(`[CONFIRM_REPLY] ${appointment.id} -> ${newStatus}`);

            return { success: true, appointmentId: appointment.id, intent: input.intent, newStatus, scheduledAt: appointment.scheduledAt.toISOString() };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolWaitlist(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            const existing = await this.prisma.waitlistEntry.findFirst({
                where: { clinicId, patientPhone: session.patientPhone, appointmentType: input.appointmentType, status: WaitlistStatus.WAITING },
            });
            if (existing) return { success: true, action: 'already_on_waitlist', waitlistId: existing.id };

            const entry = await this.prisma.waitlistEntry.create({
                data: {
                    clinicId,
                    patientId: session.patientId,
                    patientPhone: session.patientPhone,
                    patientName: input.patientName,
                    appointmentType: input.appointmentType as AppointmentType,
                    preferredDays: input.preferredDays || [],
                    preferredTime: input.preferredTime || 'any',
                    status: WaitlistStatus.WAITING,
                    notes: input.notes,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            this.logger.log(`[WAITLIST] Added entry ${entry.id}`);
            return { success: true, action: 'added', waitlistId: entry.id, appointmentType: entry.appointmentType };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolDailyReport(input: Record<string, any>, clinicId: string): Promise<any> {
        try {
            const date = input.date ? new Date(input.date) : new Date();
            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(date); end.setHours(23, 59, 59, 999);

            const [appointments, reminders, waitlistCount] = await Promise.all([
                this.prisma.appointment.findMany({ where: { clinicId, scheduledAt: { gte: start, lte: end } }, select: { status: true } }),
                this.prisma.reminderLog.findMany({ where: { clinicId, createdAt: { gte: start, lte: end } }, select: { status: true, replyIntent: true } }),
                this.prisma.waitlistEntry.count({ where: { clinicId, status: WaitlistStatus.WAITING } }),
            ]);

            const byStatus = appointments.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

            return {
                success: true,
                date: start.toISOString().split('T')[0],
                appointments: {
                    total: appointments.length,
                    scheduled: byStatus['SCHEDULED'] || 0,
                    confirmed: byStatus['CONFIRMED'] || 0,
                    cancelled: byStatus['CANCELLED'] || 0,
                    noShow: byStatus['NO_SHOW'] || 0,
                    completed: byStatus['COMPLETED'] || 0,
                    rescheduled: byStatus['RESCHEDULED'] || 0,
                },
                reminders: {
                    sent: reminders.filter((r) => ['SENT', 'DELIVERED'].includes(r.status)).length,
                    confirmedViaReply: reminders.filter((r) => r.replyIntent === 'CONFIRMED').length,
                    cancelledViaReply: reminders.filter((r) => r.replyIntent === 'CANCELLED').length,
                },
                waitlistCount,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }

    private async toolGetAppointments(input: Record<string, any>, sessionId: string, clinicId: string): Promise<any> {
        try {
            const session = await this.conversationsService.getSessionWithHistory(sessionId);
            if (!session) throw new Error('Session not found');

            const patient = session.patientId
                ? await this.prisma.patient.findUnique({ where: { id: session.patientId } })
                : await this.conversationsService.findPatientByPhone(clinicId, session.patientPhone);
            if (!patient) return { success: false, error: 'No patient record found for this number' };

            const where: any = { clinicId, patientId: patient.id };
            if (!input.includeHistory) where.scheduledAt = { gte: new Date() };

            const appointments = await this.prisma.appointment.findMany({
                where, orderBy: { scheduledAt: 'asc' }, take: 5,
                select: { id: true, appointmentType: true, status: true, scheduledAt: true, durationMins: true },
            });

            return {
                success: true,
                patientName: `${patient.firstName} ${patient.lastName}`.trim(),
                count: appointments.length,
                appointments: appointments.map((a) => ({
                    id: a.id, type: a.appointmentType, status: a.status,
                    scheduledAt: a.scheduledAt.toISOString(),
                    scheduledAtFormatted: a.scheduledAt.toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }),
                })),
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
    }
}