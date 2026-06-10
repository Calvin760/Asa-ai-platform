/**
 * src/conversations/dto/conversation-session.dto.ts
 * 
 * DTOs for conversation session management
 */

export class ConversationSessionDto {
    id!: string;
    clinicId!: string;
    patientPhone!: string;
    patientId?: string;
    status!: string;
    sessionContext!: Record<string, any>;
    lastMessageAt!: Date;
    createdAt!: Date;
    expiresAt!: Date;
}

/**
 * Session context data structure
 * Stores conversation state (patient info, selected appointment, etc)
 */
export class SessionContextDto {
    /**
     * Patient's first name (collected from conversation)
     */
    patientName?: string;

    /**
     * Appointment type selected by patient
     */
    appointmentType?: string;

    /**
     * Selected time slot
     */
    selectedSlot?: {
        start: Date;
        duration: number;
    };

    /**
     * ID of booked appointment (if confirmed)
     */
    confirmedAppointmentId?: string;

    /**
     * Any additional notes from conversation
     */
    notes?: string;

    /**
     * Patient language preference (for multi-language)
     */
    preferredLanguage?: string;
}