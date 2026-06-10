// src/common/guards/clinic.guard.ts

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ClinicGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('No authenticated user');
        }

        // clinicId can come from query params, route params, or body
        const clinicId =
            request.query.clinicId ||
            request.params.clinicId ||
            request.body?.clinicId;

        if (!clinicId) {
            throw new ForbiddenException('clinicId is required');
        }

        if (user.clinicId !== clinicId) {
            throw new ForbiddenException(
                'You do not have access to this clinic',
            );
        }

        return true;
    }
}