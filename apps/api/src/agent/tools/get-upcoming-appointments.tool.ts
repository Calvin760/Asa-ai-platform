// src/agent/tools/get-upcoming-appointments.tool.ts

export const getUpcomingAppointmentsTool = {
    name: 'get_upcoming_appointments',
    description:
        'Fetches appointments scheduled within the next 48 hours that have not yet received a reminder. Returns patient first name, phone, preferred language, appointment type, and scheduled time.',
    input_schema: {
        type: 'object',
        properties: {
            clinicId: {
                type: 'string',
                description: 'The clinic to fetch appointments for',
            },
            withinHours: {
                type: 'number',
                description: 'How many hours ahead to look. Defaults to 48.',
            },
        },
        required: ['clinicId'],
    },
};