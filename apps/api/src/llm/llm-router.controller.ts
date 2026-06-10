/**
 * src/llm/llm-router.controller.ts
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { LLMRouterService } from './llm-router.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('llm')
export class LLMRouterController {
    private readonly logger = new Logger(LLMRouterController.name);

    constructor(private readonly llmRouter: LLMRouterService) { }

    /**
     * Health check for LLM providers
     * Check if Claude and/or OpenAI are available
     */
    @Public()
    @Get('health')
    async healthCheck() {
        const health = await this.llmRouter.healthCheck();
        return {
            status: health.primary.available || health.fallback.available ? 'ok' : 'error',
            primary: health.primary,
            fallback: health.fallback,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get current LLM configuration
     */
    @Get('config')
    getConfig() {
        return this.llmRouter.getConfig();
    }
}