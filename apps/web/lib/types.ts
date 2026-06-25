// apps/web/lib/types.ts

export interface Clinic {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone: string;
    twilioWhatsAppNumber: string;
}

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'DENTIST' | 'HYGIENIST' | 'RECEPTIONIST' | 'ADMIN';
    clinicId?: string;
    clinic?: Clinic;
}

export interface Patient {
    id: string;
    clinicId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    dateOfBirth?: string;
    isActive: boolean;
}

export interface Appointment {
    id: string;
    clinicId: string;
    patientId: string;
    dentistId?: string;
    appointmentType: string;
    status: string;
    scheduledAt: string;
    durationMins: number;
    patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone'>;
    dentist?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

export interface ReminderLog {
    id: string;
    clinicId: string;
    appointmentId: string;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
    messageBody: string;
    scheduledFor: string;
    sentAt?: string;
    patientReply?: string;
    replyIntent?: string;
    appointment?: {
        scheduledAt: string;
        appointmentType: string;
        patient?: Pick<Patient, 'firstName' | 'lastName' | 'phone'>;
    };
}

export interface AgentRun {
    id: string;
    clinicId: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
    triggeredBy: 'CRON' | 'MANUAL' | 'WEBHOOK';
    startedAt: string;
    completedAt?: string;
    remindersAttempted: number;
    remindersSent: number;
    remindersFailed: number;
    errorMessage?: string;
}