// src/agent/agent.controller.ts

import { Controller, Post, Param, Get, Query, UseGuards } from '@nestjs/common';
import { AgentQueue } from './agent.queue';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { ClinicGuard } from '../common/guards/clinic.guard';

@Controller('agent')
@UseGuards(ClerkAuthGuard, ClinicGuard)
export class AgentController {
    constructor(
        private readonly agentQueue: AgentQueue,
        private readonly prisma: PrismaService,
    ) { }

    // Enqueues a real agent run
    @Post('run/:clinicId')
    run(@Param('clinicId') clinicId: string) {
        return this.agentQueue.enqueueReminderRun(clinicId, false);
    }

    // Enqueues a mock agent run
    @Post('run/:clinicId/mock')
    runMock(@Param('clinicId') clinicId: string) {
        return this.agentQueue.enqueueReminderRun(clinicId, true);
    }

    // Queue health — useful for the dashboard
    @Get('queue/status')
    queueStatus() {
        return this.agentQueue.getQueueStatus();
    }

    @Get('runs')
    getRuns(@Query('clinicId') clinicId: string) {
        return this.prisma.agentRun.findMany({
            where: { clinicId },
            orderBy: { startedAt: 'desc' },
            take: 20,
        });
    }

    @Get('runs/:id')
    getRun(@Param('id') id: string) {
        return this.prisma.agentRun.findUnique({
            where: { id },
            include: { reminderLogs: true },
        });
    }
}