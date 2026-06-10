// src/agent/tools/send-reminder.tool.ts

export const sendReminderTool = {
    name: 'send_reminder',
    description:
        'Sends a reminder message to a patient via WhatsApp or SMS. Returns whether the send succeeded and the provider message ID.',
    input_schema: {
        type: 'object',
        properties: {
            phone: {
                type: 'string',
                description: 'Patient phone number including country code e.g. +27821234567',
            },
            message: {
                type: 'string',
                description: 'The reminder message to send. Should be friendly, concise, and under 160 characters.',
            },
            channel: {
                type: 'string',
                enum: ['WHATSAPP', 'SMS'],
                description: 'Preferred channel. Use WHATSAPP first for SA patients.',
            },
        },
        required: ['phone', 'message', 'channel'],
    },
};