import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus } from '@prisma/client';

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get or create a conversation session for a patient.
     * Active sessions last 24 hours, then expire.
     * Only one active session per phone per clinic.
     */
    async getOrCreateSession(
        clinicId: string,
        patientPhone: string,
    ) {
        // Check for existing active session
        let session = await this.prisma.conversationSession.findFirst({
            where: {
                clinicId,
                patientPhone,
                status: {
                    in: [
                        ConversationStatus.STARTED,
                        ConversationStatus.IDENTIFYING,
                        ConversationStatus.IDENTIFIED,
                        ConversationStatus.COLLECTING_DETAILS,
                        ConversationStatus.PRESENTING_SLOTS,
                        ConversationStatus.AWAITING_CONFIRMATION,
                    ],
                },
                expiresAt: { gt: new Date() }, // Not expired
            },
        });

        if (session) {
            this.logger.log(`Resuming conversation session ${session.id}`);
            return session;
        }

        // Create new session (24h expiry)
        session = await this.prisma.conversationSession.create({
            data: {
                clinicId,
                patientPhone,
                status: ConversationStatus.STARTED,
                sessionContext: {},
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                
            },
        });

        this.logger.log(`Created new conversation session ${session.id}`);
        return session;
    }

    /**
     * Save a message to conversation history
     */
    async saveMessage(
        sessionId: string,
        role: 'user' | 'assistant',
        content: string,
        toolCalls?: any[],
    ) {
        const message = await this.prisma.conversationMessage.create({
            data: {
                sessionId,
                role,
                content,
                toolCalls: toolCalls ? (JSON.stringify(toolCalls) as any) : null,
            },
        });

        // Update session lastMessageAt to track recent activity
        await this.prisma.conversationSession.update({
            where: { id: sessionId },
            data: { lastMessageAt: new Date() },
        });

        return message;
    }

    /**
     * Update session context with merged data
     * (patient name, appointment type, selected slot, etc.)
     */
    async updateContext(
        sessionId: string,
        contextDelta: Record<string, any>,
    ) {
        const session = await this.prisma.conversationSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }

        // Type-safe merge: ensure sessionContext is treated as object
        const currentContext = (session.sessionContext || {}) as Record<string, any>;
        const updatedContext = {
            ...currentContext,
            ...contextDelta,
        };

        return this.prisma.conversationSession.update({
            where: { id: sessionId },
            data: { sessionContext: updatedContext as any },
        });
    }

    /**
     * Update session status (conversation flow state)
     */
    async updateStatus(sessionId: string, status: ConversationStatus) {
        return this.prisma.conversationSession.update({
            where: { id: sessionId },
            data: { status },
        });
    }

    /**
     * Link a session to a patient (when identified or patient record created)
     */
    async linkPatient(sessionId: string, patientId: string) {
        return this.prisma.conversationSession.update({
            where: { id: sessionId },
            data: { patientId },
        });
    }

    /**
     * Get full session with complete message history (ordered by time)
     */
    async getSessionWithHistory(sessionId: string) {
        return this.prisma.conversationSession.findUnique({
            where: { id: sessionId },
            include: {
                messageHistory: {
                    orderBy: { createdAt: 'asc' },
                },
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        preferredLang: true,
                    },
                },
            },
        });
    }

    /**
     * Find existing patient by phone (for linking or identification)
     */
    async findPatientByPhone(clinicId: string, phone: string) {
        return this.prisma.patient.findFirst({
            where: { clinicId, phone, isActive: true },
        });
    }

    /**
     * Find patient by name (for fuzzy matching)
     */
    async findPatientByName(
        clinicId: string,
        firstName: string,
        lastName?: string,
    ) {
        return this.prisma.patient.findFirst({
            where: {
                clinicId,
                firstName: { contains: firstName, mode: 'insensitive' },
                ...(lastName && {
                    lastName: { contains: lastName, mode: 'insensitive' },
                }),
                isActive: true,
            },
        });
    }

    /**
     * Get clinic by ID (for context/info)
     */
    async getClinicInfo(clinicId: string) {
        return this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true,
                name: true,
                timezone: true,
                phone: true,
                email: true,
            },
        });
    }

    /**
     * Mark session as expired or abandoned
     */
    async closeSession(sessionId: string, reason: 'EXPIRED' | 'ABANDONED') {
        return this.prisma.conversationSession.update({
            where: { id: sessionId },
            data: {
                status:
                    reason === 'EXPIRED'
                        ? ConversationStatus.EXPIRED
                        : ConversationStatus.ABANDONED,
            },
        });
    }

    /**
     * Find and close expired sessions (cleanup task)
     */
    async closeExpiredSessions() {
        const now = new Date();
        const result = await this.prisma.conversationSession.updateMany({
            where: {
                status: { not: ConversationStatus.CONFIRMED },
                expiresAt: { lt: now },
            },
            data: { status: ConversationStatus.EXPIRED },
        });

        this.logger.log(`Closed ${result.count} expired sessions`);
        return result;
    }
}