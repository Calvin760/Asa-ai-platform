// src/patients/dto/update-patient.dto.ts

import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
} from 'class-validator';

export class UpdatePatientDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    preferredLang?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}