// src/agent/agent.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AgentService } from './agent.service';
import { QUEUES, JOBS } from '../common/queues/queue.constants';

export interface RunRemindersJobData {
    clinicId: string;
    mock?: boolean;
}

@Processor(QUEUES.AGENT, {
    concurrency: 2, // process max 2 clinics simultaneously
})
export class AgentProcessor extends WorkerHost {
    private readonly logger = new Logger(AgentProcessor.name);

    constructor(private readonly agentService: AgentService) {
        super();
    }

    async process(job: Job<RunRemindersJobData>) {
        const { clinicId, mock } = job.data;

        this.logger.log(
            `Processing job ${job.id} — clinicId: ${clinicId} mock: ${mock ?? false}`,
        );

        switch (job.name) {
            case JOBS.RUN_REMINDERS:
                if (mock) {
                    return this.agentService.runReminderAgentMock(clinicId);
                }
                return this.agentService.runReminderAgent(clinicId);

            default:
                throw new Error(`Unknown job: ${job.name}`);
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(`Job ${job.id} completed`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`);
    }
}