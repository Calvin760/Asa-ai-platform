// src/agent/tools/log-reminder.tool.ts

export const logReminderTool = {
    name: 'log_reminder',
    description:
        'Logs the result of a reminder attempt to the database. Must be called after every send_reminder attempt, whether it succeeded or failed.',
    input_schema: {
        type: 'object',
        properties: {
            clinicId: {
                type: 'string',
                description: 'The clinic this reminder belongs to',
            },
            appointmentId: {
                type: 'string',
                description: 'The appointment this reminder is for',
            },
            agentRunId: {
                type: 'string',
                description: 'The current agent run ID',
            },
            channel: {
                type: 'string',
                enum: ['WHATSAPP', 'SMS'],
            },
            messageBody: {
                type: 'string',
                description: 'The exact message that was sent',
            },
            status: {
                type: 'string',
                enum: ['SENT', 'FAILED', 'SKIPPED'],
            },
            providerMsgId: {
                type: 'string',
                description: 'Message ID returned by the provider. Omit if failed.',
            },
        },
        required: [
            'clinicId',
            'appointmentId',
            'agentRunId',
            'channel',
            'messageBody',
            'status',
        ],
    },
};