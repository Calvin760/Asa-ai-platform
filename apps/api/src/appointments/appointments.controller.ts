// src/appointments/appointments.controller.ts

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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentStatus } from '@prisma/client';
import { ClinicGuard } from 'src/common/guards/clinic.guard';

import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(ClerkAuthGuard, ClinicGuard)
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Post()
    create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: any) {
        return this.appointmentsService.create(dto, user);
    }

    // GET /appointments?clinicId=xxx&date=2026-05-24&status=SCHEDULED&dentistId=xxx
    @Get()
    findAll(
        @Query('clinicId') clinicId: string,
        @Query('date') date?: string,
        @Query('status') status?: AppointmentStatus,
        @Query('dentistId') dentistId?: string,
    ) {
        return this.appointmentsService.findAllByClinic(clinicId, {
            date,
            status,
            dentistId,
        });
    }

    // GET /appointments/upcoming?clinicId=xxx&withinHours=48
    // Used by the agent cron job
    @Get('upcoming')
    findUpcoming(
        @Query('clinicId') clinicId: string,
        @Query('withinHours') withinHours?: string,
    ) {
        return this.appointmentsService.findUpcomingWithoutReminder(
            clinicId,
            withinHours ? parseInt(withinHours) : 48,
        );
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
    ) {
        return this.appointmentsService.findOne(id, clinicId);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
        @Body() dto: UpdateAppointmentDto,
        @CurrentUser() user: any,
    ) {
        return this.appointmentsService.update(id, clinicId, dto, user);
    }

    // PATCH /appointments/:id/status — used by reminder reply webhook
    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
        @Body() dto: UpdateAppointmentStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.appointmentsService.updateStatus(id, clinicId, dto, user);
    }
}