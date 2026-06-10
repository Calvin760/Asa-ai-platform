import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { TwilioProvider } from './twilio.provider';

@Module({
    providers: [MessagingService, TwilioProvider],
    exports: [MessagingService],
})
export class MessagingModule { }