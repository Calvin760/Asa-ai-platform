// src/reminders/dto/update-reminder-status.dto.ts

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReminderStatus } from '@prisma/client';

export class UpdateReminderStatusDto {
    @IsEnum(ReminderStatus)
    status!: ReminderStatus;

    @IsOptional()
    @IsString()
    providerMsgId?: string;

    @IsOptional()
    @IsString()
    sentAt?: string;

    @IsOptional()
    @IsString()
    deliveredAt?: string;
}