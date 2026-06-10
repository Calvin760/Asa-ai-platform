// src/appointments/dto/update-appointment-status.dto.ts

import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
    @IsEnum(AppointmentStatus)
    status!: AppointmentStatus;
}