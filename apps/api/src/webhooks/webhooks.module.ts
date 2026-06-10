import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RemindersModule } from '../reminders/reminders.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AgentModule } from 'src/agent/agent.module';

@Module({
    imports: [
        PrismaModule,
        RemindersModule,
        ConversationsModule,
        AgentModule, 
    ],
    controllers: [WebhooksController],
})
export class WebhooksModule { }