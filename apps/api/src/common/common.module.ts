// src/common/common.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClinicGuard } from './guards/clinic.guard';
import { AuditService } from './audit/audit.service';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [ClerkAuthGuard, ClinicGuard, AuditService],
    exports: [ClerkAuthGuard, ClinicGuard, AuditService],
})
export class CommonModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    }
}