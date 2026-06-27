// src/clinic/dto/update-clinic.dto.ts

import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  twilioWhatsAppNumber?: string;

  @IsOptional()
  @IsString()
  reminderSchedule?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  reminderHoursAhead?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}