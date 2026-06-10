/**
 * src/conversations/conversation-queue.processor.ts
 * 
 * Processes conversation jobs in the background
 * Handles AI processing asynchronously
 */

import { Logger } from '@nestjs/common';
import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { ConversationAgentService } from './conversation-agent.service';

export interface ConversationJobPayload {
    clinicId: string;
    patientPhone: string;
    messageBody: string;
    messageId?: string;
}

@Processor('conversations')
export class ConversationQueueProcessor {
    private readonly logger = new Logger(ConversationQueueProcessor.name);

    constructor(private readonly agentService: ConversationAgentService) { }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.log(
            `[PROCESSOR] Processing job ${job.id} for ${job.data.patientPhone}`,
        );
    }

    /**
     * Main job processor
     * Runs the full conversation agent flow
     */
    @Process('process-message')
    async processMessage(job: Job<ConversationJobPayload>) {
        this.logger.log(
            `[PROCESSOR] 🚀 Starting job ${job.id}: ${job.data.messageBody.substring(0, 50)}...`,
        );

        try {
            const { clinicId, patientPhone, messageBody, messageId } = job.data;

            // Run the full conversation agent
            const response = await this.agentService.handleInboundMessage(
                clinicId,
                patientPhone,
                messageBody,
            );

            this.logger.log(
                `[PROCESSOR] ✅ Job ${job.id} completed successfully`,
            );

            return {
                success: true,
                messageId,
                response,
                processedAt: new Date().toISOString(),
            };
        } catch (err: any) {
            this.logger.error(
                `[PROCESSOR] ❌ Job ${job.id} failed: ${err.message}`,
                err.stack,
            );
            throw err; // Re-throw to trigger retry
        }
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.log(
            `[PROCESSOR] ✅ Job ${job.id} completed with result:`,
            result,
        );
    }

    @OnQueueFailed()
    onFailed(job: Job, err: Error) {
        this.logger.error(
            `[PROCESSOR] ❌ Job ${job.id} failed permanently: ${err.message}`,
        );
        // Could send alert, store in DB, etc
    }
}