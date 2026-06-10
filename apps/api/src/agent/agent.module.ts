// src/agent/agent.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AgentService } from './agent.service';
import { AgentScheduler } from './agent.scheduler';
import { AgentController } from './agent.controller';
import { AgentProcessor } from './agent.processor';
import { AgentQueue } from './agent.queue';
import { MessagingService } from './messaging/messaging.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { RemindersModule } from '../reminders/reminders.module';
import { ClinicModule } from '../clinic/clinic.module';
import { QUEUES } from '../common/queues/queue.constants';
import { MessagingModule } from './messaging/messaging.module';

@Module({
    imports: [
        PrismaModule,
        AppointmentsModule,
        RemindersModule,
        ClinicModule,
        BullModule.registerQueue({ name: QUEUES.AGENT }),
        MessagingModule,
    ],
    controllers: [AgentController],
    providers: [
        AgentService,
        AgentScheduler,
        AgentProcessor,
        AgentQueue,
        MessagingService,
    ],
    exports: [AgentService, AgentQueue, MessagingModule, MessagingService],
})
export class AgentModule { }