// src/users/dto/create-user.dto.ts

import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
} from 'class-validator';
import { StaffRole } from '@prisma/client';


export class CreateUserDto {
    @IsEmail()
    email!: string;           // ← ! tells TS "I guarantee this will be set"

    @IsOptional()
    @IsString()
    clerkUserId?: string;

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
    @IsEnum(StaffRole)
    role?: StaffRole;

    @IsOptional()
    @IsString()
    clinicId?: string;
}