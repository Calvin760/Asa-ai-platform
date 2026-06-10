// src/common/middleware/request-logger.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('user-agent') ?? '';
        const start = Date.now();

        res.on('finish', () => {
            const { statusCode } = res;
            const duration = Date.now() - start;
            const user = (req as any).user;

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${duration}ms — ` +
                `ip:${ip} user:${user?.id ?? 'anon'} clinic:${user?.clinicId ?? 'none'} ` +
                `agent:${userAgent}`,
            );
        });

        next();
    }
}