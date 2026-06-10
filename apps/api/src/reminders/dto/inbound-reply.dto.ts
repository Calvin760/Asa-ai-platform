// src/reminders/dto/inbound-reply.dto.ts

import { IsString } from 'class-validator';

export class InboundReplyDto {
    @IsString()
    providerMsgId!: string; // Twilio/Pindo message SID

    @IsString()
    from!: string; // patient phone number

    @IsString()
    body!: string; // raw reply text
}