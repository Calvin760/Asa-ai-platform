/**
 * src/conversations/conversation-queue.service.ts
 * 
 * Handles queuing conversation messages for async processing
 * Uses BullMQ to queue jobs that are processed in background
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface ConversationJobPayload {
    clinicId: string;
    patientPhone: string;
    messageBody: string;
    messageId?: string;
}

@Injectable()
export class ConversationQueueService {
    private readonly logger = new Logger(ConversationQueueService.name);

    constructor(
        @InjectQueue('conversations') private conversationQueue: Queue,
    ) { }

    /**
     * Queue a conversation message for async processing
     * Returns immediately with jobId
     */
    async queueConversationMessage(
        payload: ConversationJobPayload,
    ): Promise<string> {
        try {
            const job = await this.conversationQueue.add(
                'process-message',
                payload,
                {
                    attempts: 3, // Retry up to 3 times
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: true, // Clean up successful jobs
                    removeOnFail: false, // Keep failed jobs for debugging
                },
            );

            this.logger.log(
                `[QUEUE] Added job ${job.id} for ${payload.patientPhone}`,
            );
            return job.id.toString();
        } catch (err: any) {
            this.logger.error(
                `[QUEUE] Failed to queue message: ${err.message}`,
            );
            throw err;
        }
    }

    /**
     * Get job status
     */
    async getJobStatus(jobId: string) {
        const job = await this.conversationQueue.getJob(jobId);
        if (!job) {
            return { status: 'not-found' };
        }

        return {
            id: job.id,
            status: await job.getState(),
            progress: job.progress(),
            attempts: job.attemptsMade,
            failedReason: job.failedReason,
            data: job.data,
        };
    }
}