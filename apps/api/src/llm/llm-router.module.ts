/**
 * src/llm/llm-router.module.ts
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMRouterService } from './llm-router.service';
import { LLMRouterController } from './llm-router.controller';

@Module({
    imports: [ConfigModule],
    providers: [LLMRouterService],
    exports: [LLMRouterService],
    controllers: [LLMRouterController],
})
export class LLMRouterModule { }