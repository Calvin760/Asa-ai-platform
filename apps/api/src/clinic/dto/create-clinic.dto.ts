// src/clinic/dto/create-clinic.dto.ts

import { IsString, IsOptional, IsEmail, IsInt, Min, Max } from 'class-validator';

export class CreateClinicDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    timezone?: string;

    @IsOptional()
    @IsString()
    reminderSchedule?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(72)
    reminderHoursAhead?: number;
}