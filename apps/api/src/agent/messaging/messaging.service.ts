// src/agent/messaging/messaging.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { TwilioProvider } from './twilio.provider';
import { SendMessageResult } from './messaging.interface';

export type MessageChannel = 'WHATSAPP' | 'SMS';

@Injectable()
export class MessagingService {
    private readonly logger = new Logger(MessagingService.name);
    private readonly provider: TwilioProvider;

    constructor() {
        this.provider = new TwilioProvider();
    }

    async sendWhatsApp(to: string, body: string): Promise<SendMessageResult> {
        this.logger.log(`Sending WhatsApp to ${to}`);
        const result = await this.provider.sendWhatsApp(to, body);

        // If WhatsApp fails, fall back to SMS automatically
        if (!result.success) {
            this.logger.warn(
                `WhatsApp failed for ${to}, falling back to SMS`,
            );
            return this.sendSms(to, body);
        }

        return result;
    }

    async sendSms(to: string, body: string): Promise<SendMessageResult> {
        this.logger.log(`Sending SMS to ${to}`);
        return this.provider.sendSms(to, body);
    }

    async send(
        channel: MessageChannel,
        to: string,
        body: string,
    ): Promise<SendMessageResult> {
        if (channel === 'WHATSAPP') {
            return this.sendWhatsApp(to, body);
        }
        return this.sendSms(to, body);
    }
}