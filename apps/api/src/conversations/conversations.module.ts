/**
 * src/conversations/conversations.module.ts - UPSTASH VERSION
 * 
 * Configured for Upstash Cloud Redis
 * Includes:
 * 1. TLS/SSL for secure connection
 * 2. Upstash-specific settings
 * 3. Connection retry logic
 * 4. Proper timeout handling
 */

import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { ConversationsService } from './conversations.service';
import { ConversationAgentService } from './conversation-agent.service';
import { ConversationQueueService } from './conversation-queue.service';
import { ConversationQueueProcessor } from './conversation-queue.processor';
import { ConversationsController } from './conversations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AgentModule } from '../agent/agent.module';
import { LLMRouterModule } from '../llm/llm-router.module';
import { PatientsService } from 'src/patients/patients.service';
import { AuditService } from 'src/common/audit/audit.service';

const logger = new Logger('ConversationsModule');

@Module({
    imports: [
        BullModule.registerQueueAsync({
            name: 'conversations',
            useFactory: (configService: ConfigService) => {
                // Parse Upstash connection URL
                const redisUrl = configService.get('REDIS_URL') ||
                    configService.get('REDIS_URL') ||
                    'redis://localhost:6379';

                logger.log(`🔗 Configuring BullMQ with Redis URL: ${redisUrl.substring(0, 50)}...`);

                // ✅ For Upstash, we need to parse the connection details
                // Upstash provides URL in format: rediss://default:password@host:port
                const url = new URL(redisUrl.replace('rediss://', 'https://').replace('redis://', 'http://'));

                const host = url.hostname;
                const port = parseInt(url.port) || 6379;
                const password = url.password || configService.get('REDIS_PASSWORD');
                const username = url.username || 'default';

                logger.log(`📍 Redis Host: ${host}`);
                logger.log(`🔒 Using TLS: true`);

                return {
                    redis: {
                        host,
                        port,
                        password,
                        username,
                        // ✅ Critical for Upstash: TLS connection
                        tls: {
                            rejectUnauthorized: false, // Upstash uses self-signed certs
                        },
                        // Connection settings
                        maxRetriesPerRequest: null, // ✅ Unlimited retries
                        enableReadyCheck: false,
                        enableOfflineQueue: true,
                        // Timeouts - Upstash can be slower
                        connectTimeout: 20000, // 20s timeout
                        commandTimeout: 20000,
                        retryStrategy: (times: number) => {
                            const delay = Math.min(times * 100, 3000);
                            if (times > 1) {
                                logger.warn(
                                    `⏳ Redis reconnection attempt ${times}, waiting ${delay}ms`,
                                );
                            }
                            return delay;
                        },
                        // Socket settings
                        keepAlive: 30000,
                        socketKeepaliveInterval: 30000,
                    },
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                        removeOnComplete: true,
                        removeOnFail: false,
                    },
                    settings: {
                        stalledInterval: 10000,
                        maxStalledCount: 2,
                        lockDuration: 30000,
                        lockRenewTime: 15000,
                        retryProcessDelay: 5000,
                    },
                };
            },
            inject: [ConfigService],
        }),
        PrismaModule,
        AppointmentsModule,
        AgentModule,
        LLMRouterModule,
        
    ],
    providers: [
        ConversationsService,
        ConversationAgentService,
        ConversationQueueService,
        ConversationQueueProcessor,
        PatientsService,
        AuditService,
    ],
    controllers: [ConversationsController],
    exports: [
        ConversationsService,
        ConversationAgentService,
        ConversationQueueService,
    ],
})
export class ConversationsModule { }