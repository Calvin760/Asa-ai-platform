// src/agent/messaging/twilio.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { IMessagingProvider, SendMessageResult } from './messaging.interface';

@Injectable()
export class TwilioProvider implements IMessagingProvider {
    private readonly logger = new Logger(TwilioProvider.name);
    private readonly client: twilio.Twilio;
    private readonly phoneNumber: string;
    private readonly whatsAppNumber: string;

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
        }

        this.client = twilio(accountSid, authToken);
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER ?? '';
        this.whatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? '';
    }

    async sendSms(to: string, body: string): Promise<SendMessageResult> {
        try {
            const message = await this.client.messages.create({
                from: this.phoneNumber,
                to,
                body,
            });

            this.logger.log(`SMS sent to ${to} — SID: ${message.sid}`);

            return {
                success: true,
                providerMsgId: message.sid,
            };
        } catch (err: any) {
            this.logger.error(`SMS failed to ${to}: ${err.message}`);
            return {
                success: false,
                providerMsgId: '',
                error: err.message,
            };
        }
    }

    async sendWhatsApp(to: string, body: string): Promise<SendMessageResult> {
        try {
            // Twilio WhatsApp requires 'whatsapp:' prefix
            const message = await this.client.messages.create({
                from: `whatsapp:${this.whatsAppNumber}`,
                to: `whatsapp:${to}`,
                body,
            });

            this.logger.log(`WhatsApp sent to ${to} — SID: ${message.sid}`);

            return {
                success: true,
                providerMsgId: message.sid,
            };
        } catch (err: any) {
            this.logger.error(`WhatsApp failed to ${to}: ${err.message}`);
            return {
                success: false,
                providerMsgId: '',
                error: err.message,
            };
        }
    }
}