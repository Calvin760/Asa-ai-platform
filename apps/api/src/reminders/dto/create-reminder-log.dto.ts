// src/reminders/dto/create-reminder-log.dto.ts

import {
    IsString,
    IsEnum,
    IsDateString,
} from 'class-validator';
import { ReminderChannel } from '@prisma/client';

export class CreateReminderLogDto {
    @IsString()
    clinicId!: string;

    @IsString()
    appointmentId!: string;

    @IsEnum(ReminderChannel)
    channel!: ReminderChannel;

    @IsString()
    messageBody!: string;

    @IsDateString()
    scheduledFor!: string;

    @IsString()
    agentRunId!: string;
}