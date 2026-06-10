// src/agent/agent.queue.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '../common/queues/queue.constants';
import { RunRemindersJobData } from './agent.processor';

@Injectable()
export class AgentQueue {
    private readonly logger = new Logger(AgentQueue.name);

    constructor(
        @InjectQueue(QUEUES.AGENT) private readonly agentQueue: Queue,
    ) { }

    async enqueueReminderRun(clinicId: string, mock = false) {
        const job = await this.agentQueue.add(
            JOBS.RUN_REMINDERS,
            { clinicId, mock } satisfies RunRemindersJobData,
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // 5s, 10s, 20s
                },
                removeOnComplete: 100, // keep last 100 completed jobs
                removeOnFail: 200,     // keep last 200 failed jobs
            },
        );

        this.logger.log(
            `Enqueued reminder run for clinic ${clinicId} — job ${job.id}`,
        );

        return { jobId: job.id, clinicId, mock };
    }

    async getQueueStatus() {
        const [waiting, active, completed, failed] = await Promise.all([
            this.agentQueue.getWaitingCount(),
            this.agentQueue.getActiveCount(),
            this.agentQueue.getCompletedCount(),
            this.agentQueue.getFailedCount(),
        ]);

        return { waiting, active, completed, failed };
    }
}