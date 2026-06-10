// src/appointments/dto/create-appointment.dto.ts

import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsInt,
    Min,
} from 'class-validator';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
    @IsString()
    clinicId!: string;

    @IsString()
    patientId!: string;

    @IsOptional()
    @IsString()
    dentistId?: string;

    @IsEnum(AppointmentType)
    appointmentType!: AppointmentType;

    @IsDateString()
    scheduledAt!: string;

    @IsOptional()
    @IsInt()
    @Min(15)
    durationMins?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}