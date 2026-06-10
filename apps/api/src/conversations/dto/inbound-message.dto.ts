/**
 * src/conversations/dto/inbound-message.dto.ts
 * 
 * DTO for inbound WhatsApp/SMS messages from Twilio
 */

export class InboundMessageDto {
    /**
     * Patient phone number (with country code)
     * Format: +27123456789 or whatsapp:+27123456789
     */
    patientPhone!: string;

    /**
     * Message body text
     */
    messageBody!: string;

    /**
     * Clinic ID receiving the message
     * Optional in webhook (auto-detected from Twilio number)
     * Required in test endpoint
     */
    clinicId?: string;

    /**
     * Twilio message ID for tracking
     */
    providerMsgId?: string;

    /**
     * Message timestamp
     */
    timestamp?: Date;
}