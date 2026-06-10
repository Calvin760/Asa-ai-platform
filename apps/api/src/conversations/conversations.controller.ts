/**
 * src/conversations/conversations.controller.ts - UPDATED
 * 
 * Removes test endpoint (use curl to Twilio endpoint instead)
 * Adds job status endpoint for monitoring
 */

import {
    Controller,
    Get,
    Param,
    Logger,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationQueueService } from './conversation-queue.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('conversations')
export class ConversationsController {
    private readonly logger = new Logger(ConversationsController.name);

    constructor(
        private readonly conversationsService: ConversationsService,
        private readonly queueService: ConversationQueueService,
    ) { }

    /**
     * Get conversation session details
     * Protected - requires auth
     */
    @Get('sessions/:sessionId')
    async getSession(
        @Param('sessionId') sessionId: string,
        @CurrentUser() user: any,
    ) {
        const session = await this.conversationsService.getSessionWithHistory(
            sessionId,
        );

        if (!session) {
            return { error: 'Session not found' };
        }

        // Check authorization
        if (user.clinicId !== session.clinicId) {
            return { error: 'Unauthorized' };
        }

        return session;
    }

    /**
     * Get job status
     * Protected - requires auth
     * 
     * Usage:
     * GET /conversations/jobs/12345
     * Shows if conversation message is still processing
     */
    @Get('jobs/:jobId')
    async getJobStatus(
        @Param('jobId') jobId: string,
        @CurrentUser() user: any,
    ) {
        if (!user) {
            return { error: 'Unauthorized' };
        }

        const status = await this.queueService.getJobStatus(jobId);
        return status;
    }
}