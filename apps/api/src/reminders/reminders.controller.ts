// src/reminders/reminders.controller.ts

import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { UpdateReminderStatusDto } from './dto/update-reminder-status.dto';
import { InboundReplyDto } from './dto/inbound-reply.dto';

import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { ClinicGuard } from '../common/guards/clinic.guard';

@Controller('reminders')
@UseGuards(ClerkAuthGuard, ClinicGuard)
export class RemindersController {
    constructor(private readonly remindersService: RemindersService) { }

    // GET /reminders?clinicId=xxx&limit=50
    @Get()
    findByClinic(
        @Query('clinicId') clinicId: string,
        @Query('limit') limit?: string,
    ) {
        return this.remindersService.findByClinic(
            clinicId,
            limit ? parseInt(limit) : 50,
        );
    }

    @Get('appointment/:appointmentId')
    findByAppointment(@Param('appointmentId') appointmentId: string) {
        return this.remindersService.findByAppointment(appointmentId);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateReminderStatusDto,
    ) {
        return this.remindersService.updateStatus(id, dto);
    }

    // POST /reminders/webhook/reply
    // Twilio/Pindo calls this when a patient replies to a message
    @Post('webhook/reply')
    handleReply(@Body() dto: InboundReplyDto) {
        return this.remindersService.handleInboundReply(dto);
    }
}