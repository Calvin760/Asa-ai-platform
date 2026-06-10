// src/appointments/dto/update-appointment.dto.ts

import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsInt,
    Min,
} from 'class-validator';
import { AppointmentType } from '@prisma/client';

export class UpdateAppointmentDto {
    @IsOptional()
    @IsString()
    dentistId?: string;

    @IsOptional()
    @IsEnum(AppointmentType)
    appointmentType?: AppointmentType;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @IsOptional()
    @IsInt()
    @Min(15)
    durationMins?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}