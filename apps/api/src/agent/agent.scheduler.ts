// src/agent/agent.scheduler.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AgentQueue } from './agent.queue';
import { ClinicService } from '../clinic/clinic.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AgentScheduler implements OnModuleInit {
    private readonly logger = new Logger(AgentScheduler.name);

    constructor(
        private readonly agentQueue: AgentQueue,
        private readonly clinicService: ClinicService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) { }

    // Runs once on startup — registers a cron job for every active clinic
    async onModuleInit() {
        await this.registerAllClinics();
    }

    async registerAllClinics() {
        const clinics = await this.clinicService.findAllActive();

        for (const clinic of clinics) {
            this.registerClinicJob(
                clinic.id,
                clinic.name,
                clinic.reminderSchedule,
                clinic.timezone,
                clinic.reminderHoursAhead,
            );
        }

        this.logger.log(`Registered ${clinics.length} clinic scheduler(s)`);
    }

    registerClinicJob(
        clinicId: string,
        clinicName: string,
        schedule: string,
        timezone: string,
        hoursAhead: number,
    ) {
        const jobName = `reminders:${clinicId}`;

        // Remove existing job if it exists — handles re-registration
        if (this.schedulerRegistry.doesExist('cron', jobName)) {
            this.schedulerRegistry.deleteCronJob(jobName);
            this.logger.log(`Removed existing cron job for ${clinicName}`);
        }

        const job = new CronJob(
            schedule,
            async () => {
                this.logger.log(
                    `Cron fired for clinic ${clinicName} — enqueuing reminder run`,
                );
                try {
                    await this.agentQueue.enqueueReminderRun(clinicId);
                } catch (err: any) {
                    this.logger.error(
                        `Failed to enqueue for clinic ${clinicName}: ${err.message}`,
                    );
                }
            },
            null,
            true,
            timezone,
        );

        this.schedulerRegistry.addCronJob(jobName, job);

        this.logger.log(
            `Registered cron for ${clinicName} — schedule: "${schedule}" timezone: ${timezone}`,
        );
    }

    // Call this after a clinic updates their schedule
    async refreshClinicJob(clinicId: string) {
        const clinics = await this.clinicService.findAllActive();
        const clinic = clinics.find((c) => c.id === clinicId);

        if (!clinic) {
            this.logger.warn(`Clinic ${clinicId} not found for scheduler refresh`);
            return;
        }

        this.registerClinicJob(
            clinic.id,
            clinic.name,
            clinic.reminderSchedule,
            clinic.timezone,
            clinic.reminderHoursAhead,
        );

        this.logger.log(`Refreshed scheduler for clinic ${clinic.name}`);
    }

    @OnEvent('clinic.schedule.updated')
    async handleScheduleUpdated(payload: { clinicId: string }) {
        this.logger.log(
            `Schedule update event received for clinic ${payload.clinicId}`,
        );
        await this.refreshClinicJob(payload.clinicId);
    }
}