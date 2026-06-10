// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { ClinicModule } from './clinic/clinic.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RemindersModule } from './reminders/reminders.module';
import { AgentModule } from './agent/agent.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ClerkAuthGuard } from './common/guards/clerk-auth.guard';
import { QUEUES } from './common/queues/queue.constants';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConversationsModule } from './conversations/conversations.module';
import { LLMRouterModule } from './llm/llm-router.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({

      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_HOST !== 'localhost'
          ? {} // Upstash requires TLS
          : undefined,
      },
    }),
    BullModule.registerQueue({
      name: QUEUES.AGENT,
    }),
    PrismaModule,
    CommonModule,
    ClinicModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    RemindersModule,
    AgentModule,
    WebhooksModule,
    ConversationsModule,
    LLMRouterModule,
    EventEmitterModule.forRoot(),
    
  ],
  providers: [
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }