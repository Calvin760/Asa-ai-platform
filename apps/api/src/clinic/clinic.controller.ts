// src/clinic/clinic.controller.ts

import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClinicService } from './clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Controller('clinics')
export class ClinicController {
    constructor(
        private readonly clinicService: ClinicService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    @Post()
    create(@Body() dto: CreateClinicDto) {
        return this.clinicService.create(dto);
    }

    @Get()
    findAll() {
        return this.clinicService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clinicService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
        const clinic = await this.clinicService.update(id, dto);

        // If schedule changed, notify the scheduler
        if (dto.reminderSchedule || dto.timezone) {
            this.eventEmitter.emit('clinic.schedule.updated', { clinicId: id });
        }

        return clinic;
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.clinicService.remove(id);
    }
}