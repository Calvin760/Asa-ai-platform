// src/agent/agent.service.ts

import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { RemindersService } from '../reminders/reminders.service';
import { MessagingService } from './messaging/messaging.service';
import { getUpcomingAppointmentsTool } from './tools/get-upcoming-appointments.tool';
import { sendReminderTool } from './tools/send-reminder.tool';
import { logReminderTool } from './tools/log-reminder.tool';
import { ReminderChannel, ReminderStatus, RunStatus } from '@prisma/client';

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);
    private readonly anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    constructor(
        private readonly prisma: PrismaService,
        private readonly appointmentsService: AppointmentsService,
        private readonly remindersService: RemindersService,
        private readonly messagingService: MessagingService,
    ) { }

    // ----------------------------------------------------------------
    // Main entry point — called by scheduler or manual trigger
    // ----------------------------------------------------------------
    async runReminderAgent(clinicId: string) {
        this.logger.log(`Starting reminder agent run for clinic ${clinicId}`);

        // Create the run record immediately so every action is traceable
        const agentRun = await this.prisma.agentRun.create({
            data: { clinicId, triggeredBy: 'CRON', status: 'RUNNING' },
        });

        const toolCallLog: any[] = [];
        let remindersAttempted = 0;
        let remindersSent = 0;
        let remindersFailed = 0;

        try {
            const messages: Anthropic.MessageParam[] = [
                {
                    role: 'user',
                    content: `You are a dental clinic assistant. Your job is to send appointment reminders to patients.

Run the following steps in order:
1. Call get_upcoming_appointments for clinic "${clinicId}" to get appointments needing reminders.
2. For each appointment, craft a friendly reminder message in the patient's preferred language (default English). Keep messages under 160 characters. Include the patient's first name, appointment type, and time.
3. Call send_reminder for each patient using WHATSAPP as the channel.
4. Call log_reminder after every send attempt, whether it succeeded or failed.
5. Stop when all appointments have been processed.

Current agent run ID: ${agentRun.id}
Current time: ${new Date().toISOString()}`,
                },
            ];

            // Agentic loop — runs until Claude stops calling tools
            while (true) {
                const response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 4096,
                    tools: [
                        getUpcomingAppointmentsTool as any,
                        sendReminderTool as any,
                        logReminderTool as any,
                    ],
                    messages,
                });

                // Append assistant response to message history
                messages.push({ role: 'assistant', content: response.content });

                // No more tool calls — agent is done
                if (response.stop_reason === 'end_turn') {
                    this.logger.log(`Agent run ${agentRun.id} completed`);
                    break;
                }

                // Process tool calls
                const toolResults: Anthropic.ToolResultBlockParam[] = [];

                for (const block of response.content) {
                    if (block.type !== 'tool_use') continue;

                    const start = Date.now();
                    let output: any;

                    try {
                        output = await this.executeTool(
                            block.name,
                            block.input as any,
                            agentRun.id,
                        );

                        // Update counters based on tool
                        if (block.name === 'send_reminder') {
                            remindersAttempted++;
                            if (output.success) remindersSent++;
                            else remindersFailed++;
                        }
                    } catch (err: any) {
                        output = { error: err.message };
                        this.logger.error(`Tool ${block.name} failed: ${err.message}`);
                    }

                    toolCallLog.push({
                        tool: block.name,
                        input: block.input,
                        output,
                        durationMs: Date.now() - start,
                    });

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: JSON.stringify(output),
                    });
                }

                // Feed tool results back to Claude
                messages.push({ role: 'user', content: toolResults });
            }

            // Mark run as completed
            await this.prisma.agentRun.update({
                where: { id: agentRun.id },
                data: {
                    status: RunStatus.COMPLETED,
                    completedAt: new Date(),
                    toolCallLog,
                    remindersAttempted,
                    remindersSent,
                    remindersFailed,
                },
            });

            return {
                agentRunId: agentRun.id,
                remindersAttempted,
                remindersSent,
                remindersFailed,
            };
        } catch (err: any) {
            this.logger.error(`Agent run ${agentRun.id} failed: ${err.message}`);

            await this.prisma.agentRun.update({
                where: { id: agentRun.id },
                data: {
                    status: RunStatus.FAILED,
                    completedAt: new Date(),
                    errorMessage: err.message,
                    toolCallLog,
                    remindersAttempted,
                    remindersSent,
                    remindersFailed,
                },
            });

            throw err;
        }
    }

    // src/agent/agent.service.ts — add this method alongside runReminderAgent

    async runReminderAgentMock(clinicId: string) {
        this.logger.log(`Starting MOCK reminder agent run for clinic ${clinicId}`);

        const agentRun = await this.prisma.agentRun.create({
            data: { clinicId, triggeredBy: 'MANUAL', status: 'RUNNING' },
        });

        let remindersAttempted = 0;
        let remindersSent = 0;
        let remindersFailed = 0;
        const toolCallLog: any[] = [];

        try {
            // Step 1 — get upcoming appointments
            const appointments =
                await this.appointmentsService.findUpcomingWithoutReminder(clinicId, 24);

            this.logger.log(`Found ${appointments.length} appointments needing reminders`);

            // Step 2 — send a reminder for each
            for (const appt of appointments) {
                const message =
                    `Hi ${appt.patient.firstName}, this is a reminder for your ` +
                    `${appt.appointmentType.toLowerCase()} appointment on ` +
                    `${new Date(appt.scheduledAt).toLocaleString('en-ZA', {
                        timeZone: 'Africa/Johannesburg',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                    })}. Reply YES to confirm or NO to cancel.`;

                remindersAttempted++;

                // Step 3 — send via messaging stub
                const sendResult = await this.messagingService.sendWhatsApp(
                    appt.patient.phone,
                    message,
                );

                if (sendResult.success) remindersSent++;
                else remindersFailed++;

                toolCallLog.push({
                    tool: 'send_reminder',
                    input: { phone: appt.patient.phone, message, channel: 'WHATSAPP' },
                    output: sendResult,
                });

                // Step 4 — log the result
                const log = await this.remindersService.createLog({
                    clinicId,
                    appointmentId: appt.id,
                    agentRunId: agentRun.id,
                    channel: 'WHATSAPP',
                    messageBody: message,
                    scheduledFor: new Date().toISOString(),
                });

                await this.remindersService.updateStatus(log.id, {
                    status: sendResult.success ? 'SENT' : 'FAILED',
                    providerMsgId: sendResult.providerMsgId,
                    sentAt: new Date().toISOString(),
                });

                toolCallLog.push({
                    tool: 'log_reminder',
                    input: { appointmentId: appt.id, status: sendResult.success ? 'SENT' : 'FAILED' },
                    output: { logged: true, logId: log.id },
                });
            }

            await this.prisma.agentRun.update({
                where: { id: agentRun.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    toolCallLog,
                    remindersAttempted,
                    remindersSent,
                    remindersFailed,
                },
            });

            return {
                agentRunId: agentRun.id,
                remindersAttempted,
                remindersSent,
                remindersFailed,
            };
        } catch (err: any) {
            await this.prisma.agentRun.update({
                where: { id: agentRun.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage: err.message,
                    toolCallLog,
                },
            });
            throw err;
        }
    }
    // ----------------------------------------------------------------
    // Tool executor — maps tool names to actual service calls
    // ----------------------------------------------------------------
    private async executeTool(
        name: string,
        input: Record<string, any>,
        agentRunId: string,
    ) {
        switch (name) {
            case 'get_upcoming_appointments': {
                const appointments =
                    await this.appointmentsService.findUpcomingWithoutReminder(
                        input.clinicId,
                        input.withinHours ?? 48,
                    );

                // Return only what the agent needs — no extra PHI
                return appointments.map((a) => ({
                    id: a.id,
                    patientId: a.patient.id,
                    firstName: a.patient.firstName,
                    phone: a.patient.phone,
                    preferredLang: a.patient.preferredLang,
                    appointmentType: a.appointmentType,
                    scheduledAt: a.scheduledAt.toISOString(),
                }));
            }

            case 'send_reminder': {
                const channel = input.channel as ReminderChannel;

                const result =
                    channel === ReminderChannel.WHATSAPP
                        ? await this.messagingService.sendWhatsApp(
                            input.phone,
                            input.message,
                        )
                        : await this.messagingService.sendSms(input.phone, input.message);

                return result;
            }

            case 'log_reminder': {
                const log = await this.remindersService.createLog({
                    clinicId: input.clinicId,
                    appointmentId: input.appointmentId,
                    agentRunId,
                    channel: input.channel as ReminderChannel,
                    messageBody: input.messageBody,
                    scheduledFor: new Date().toISOString(),
                });

                if (input.providerMsgId) {
                    await this.remindersService.updateStatus(log.id, {
                        status: input.status as ReminderStatus,
                        providerMsgId: input.providerMsgId,
                        sentAt: new Date().toISOString(),
                    });
                } else {
                    await this.remindersService.updateStatus(log.id, {
                        status: input.status as ReminderStatus,
                    });
                }

                return { logged: true, logId: log.id };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
}