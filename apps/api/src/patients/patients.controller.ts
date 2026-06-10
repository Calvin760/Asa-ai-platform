// src/patients/patients.controller.ts

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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { ClinicGuard } from '../common/guards/clinic.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';


@Controller('patients')
@UseGuards(ClerkAuthGuard, ClinicGuard)
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Post()
    create(
        @Body() dto: CreatePatientDto,
        @CurrentUser() user: any,
    ) {
        return this.patientsService.create(dto, user);
    }

    // GET /patients?clinicId=xxx
    @Get()
    findAll(@Query('clinicId') clinicId: string) {
        return this.patientsService.findAllByClinic(clinicId);
    }

    // GET /patients/search?clinicId=xxx&q=smith
    @Get('search')
    search(
        @Query('clinicId') clinicId: string,
        @Query('q') query: string,
    ) {
        return this.patientsService.search(clinicId, query);
    }

    // GET /patients/:id?clinicId=xxx
    @Get(':id')
    findOne(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
    ) {
        return this.patientsService.findOne(id, clinicId);
    }

    // PATCH /patients/:id?clinicId=xxx
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
        @Body() dto: UpdatePatientDto,
    ) {
        return this.patientsService.update(id, clinicId, dto);
    }

    @Patch(':id/deactivate')
    deactivate(
        @Param('id') id: string,
        @Query('clinicId') clinicId: string,
        @CurrentUser() user: any,
    ) {
        return this.patientsService.deactivate(id, clinicId, user);
    }
}