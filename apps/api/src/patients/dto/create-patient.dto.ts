// src/patients/dto/create-patient.dto.ts

import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
} from 'class-validator';

export class CreatePatientDto {
    @IsString()
    clinicId!: string;

    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

    @IsString()
    phone!: string;

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