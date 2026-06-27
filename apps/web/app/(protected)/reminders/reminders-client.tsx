// apps/web/app/(protected)/reminders/reminders-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, ReminderLog, AgentRun } from '../../../lib/types';

const CHANNEL_STYLES: Record<string, string> = {
    WHATSAPP: 'bg-[#E7F5EC] text-[#1F9D55]',
    SMS: 'bg-[#E3EBE9] text-[#1C3D3A]',
    EMAIL: 'bg-[#F0F2E3] text-[#7C8B3D]',
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-[#F3F0E9] text-[#1C3D3A99]',
    SENT: 'bg-[#E3EBE9] text-[#1C3D3A]',
    DELIVERED: 'bg-[#E7F5EC] text-[#1F9D55]',
    FAILED: 'bg-[#FBEAE9] text-[#C23B3B]',
    SKIPPED: 'bg-[#F5E8E3] text-[#B55538]',
};

const INTENT_STYLES: Record<string, string> = {
    CONFIRMED: 'bg-[#E7F5EC] text-[#1F9D55]',
    CANCELLED: 'bg-[#FBEAE9] text-[#C23B3B]',
    RESCHEDULE_REQUESTED: 'bg-[#F5E8E3] text-[#B55538]',
    UNCLEAR: 'bg-[#F3F0E9] text-[#1C3D3A99]',
};

function RunStatus({ status }: { status: AgentRun['status'] }) {
    const styles: Record<AgentRun['status'], string> = {
        COMPLETED: 'bg-[#E7F5EC] text-[#1F9D55]',
        RUNNING: 'bg-[#F5E8E3] text-[#8C4129]',
        FAILED: 'bg-[#FBEAE9] text-[#C23B3B]',
        PARTIAL: 'bg-[#F0F2E3] text-[#7C8B3D]',
    };
    return (
        <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${styles[status]}`}
        >
            {status}
        </span>
    );
}

export default function RemindersClient({
    user,
    initialLogs,
    initialRuns,
}: {
    user: User;
    initialLogs: ReminderLog[];
    initialRuns: AgentRun[];
}) {
    const api = useApi();
    const [logs, setLogs] = useState(initialLogs);
    const [runs, setRuns] = useState(initialRuns);
    const [activeTab, setActiveTab] = useState<'logs' | 'runs'>('logs');
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');

    async function triggerAgent() {
        if (!user.clinicId) return;
        setRunning(true);
        setError('');
        try {
            await api.post(`/agent/run/${user.clinicId}/mock`, {});

            // Refresh both logs and runs
            const [updatedLogs, updatedRuns] = await Promise.all([
                api.get<ReminderLog[]>(
                    `/reminders?clinicId=${user.clinicId}&limit=50`,
                ),
                api.get<AgentRun[]>(`/agent/runs?clinicId=${user.clinicId}`),
            ]);

            setLogs(updatedLogs);
            setRuns(updatedRuns);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Agent run failed');
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="w-full max-w-none space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#1C3D3A]">Reminders</h1>
                <button
                    onClick={triggerAgent}
                    disabled={running}
                    className="bg-[#B55538] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#9c4730] disabled:opacity-50 transition-colors"
                >
                    {running ? 'Running...' : 'Run reminders now'}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-[#C23B3B]/30 bg-[#FBEAE9] px-4 py-3 text-sm text-[#C23B3B]">
                    {error}
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'Total sent',
                        value: logs.filter((l) =>
                            ['SENT', 'DELIVERED'].includes(l.status),
                        ).length,
                    },
                    {
                        label: 'Delivered',
                        value: logs.filter((l) => l.status === 'DELIVERED').length,
                    },
                    {
                        label: 'Failed',
                        value: logs.filter((l) => l.status === 'FAILED').length,
                    },
                    {
                        label: 'Confirmed',
                        value: logs.filter((l) => l.replyIntent === 'CONFIRMED').length,
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="min-h-[100px] rounded-[10px] border border-[#E4E0D6] bg-white p-4"
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1C3D3A66]">
                            {stat.label}
                        </p>
                        <p className="mt-2 text-[26px] font-extrabold leading-none text-[#1C3D3A]">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex w-fit gap-1 rounded-lg bg-[#F3F0E9] p-1">
                {(['logs', 'runs'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-md px-4 py-1.5 text-sm font-bold transition-colors ${
                            activeTab === tab
                                ? 'bg-white text-[#1C3D3A] shadow-sm'
                                : 'text-[#1C3D3A99] hover:text-[#1C3D3A]'
                        }`}
                    >
                        {tab === 'logs' ? 'Reminder logs' : 'Agent runs'}
                    </button>
                ))}
            </div>

            {/* Reminder logs tab */}
            {activeTab === 'logs' && (
                <div className="overflow-hidden rounded-[10px] border border-[#E4E0D6] bg-white">
                    {logs.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-[#1C3D3A99]">
                            No reminders sent yet. Click &ldquo;Run reminders now&rdquo; to start.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#E4E0D6] text-left text-xs text-[#1C3D3A66]">
                                    <th className="px-5 py-3 font-medium">Patient</th>
                                    <th className="px-5 py-3 font-medium">Appointment</th>
                                    <th className="px-5 py-3 font-medium">Channel</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Reply</th>
                                    <th className="px-5 py-3 font-medium">Sent at</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-[#E4E0D6] last:border-0 hover:bg-[#F3F0E9]"
                                    >
                                        <td className="px-5 py-3 font-bold text-[#1C3D3A]">
                                            {log.appointment?.patient
                                                ? `${log.appointment.patient.firstName} ${log.appointment.patient.lastName}`
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-[#1C3D3A99]">
                                            <div>
                                                {log.appointment?.appointmentType?.replace('_', ' ') ?? '—'}
                                            </div>
                                            <div className="text-xs text-[#1C3D3A66]">
                                                {log.appointment?.scheduledAt
                                                    ? new Date(
                                                        log.appointment.scheduledAt,
                                                    ).toLocaleString('en-ZA', {
                                                        timeZone: 'Africa/Johannesburg',
                                                        dateStyle: 'short',
                                                        timeStyle: 'short',
                                                    })
                                                    : ''}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                                    CHANNEL_STYLES[log.channel] ??
                                                    'bg-[#F3F0E9] text-[#1C3D3A99]'
                                                }`}
                                            >
                                                {log.channel}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                                    STATUS_STYLES[log.status] ??
                                                    'bg-[#F3F0E9] text-[#1C3D3A99]'
                                                }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {log.replyIntent ? (
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                                        INTENT_STYLES[log.replyIntent] ??
                                                        'bg-[#F3F0E9] text-[#1C3D3A99]'
                                                    }`}
                                                >
                                                    {log.replyIntent.replace('_', ' ')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[#1C3D3A55]">
                                                    awaiting
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[#1C3D3A99]">
                                            {log.sentAt
                                                ? new Date(log.sentAt).toLocaleString('en-ZA', {
                                                    timeZone: 'Africa/Johannesburg',
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Agent runs tab */}
            {activeTab === 'runs' && (
                <div className="overflow-hidden rounded-[10px] border border-[#E4E0D6] bg-white">
                    {runs.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-[#1C3D3A99]">
                            No agent runs yet.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#E4E0D6] text-left text-xs text-[#1C3D3A66]">
                                    <th className="px-5 py-3 font-medium">Started</th>
                                    <th className="px-5 py-3 font-medium">Trigger</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Attempted</th>
                                    <th className="px-5 py-3 font-medium">Sent</th>
                                    <th className="px-5 py-3 font-medium">Failed</th>
                                    <th className="px-5 py-3 font-medium">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.map((run) => (
                                    <tr
                                        key={run.id}
                                        className="border-b border-[#E4E0D6] last:border-0 hover:bg-[#F3F0E9]"
                                    >
                                        <td className="px-5 py-3 text-[#1C3D3A99]">
                                            {new Date(run.startedAt).toLocaleString('en-ZA', {
                                                timeZone: 'Africa/Johannesburg',
                                                dateStyle: 'short',
                                                timeStyle: 'short',
                                            })}
                                        </td>
                                        <td className="px-5 py-3 text-[#1C3D3A66]">
                                            {run.triggeredBy}
                                        </td>
                                        <td className="px-5 py-3">
                                            <RunStatus status={run.status} />
                                        </td>
                                        <td className="px-5 py-3 text-[#1C3D3A99]">
                                            {run.remindersAttempted}
                                        </td>
                                        <td className="px-5 py-3 font-bold text-[#1F9D55]">
                                            {run.remindersSent}
                                        </td>
                                        <td className="px-5 py-3 font-bold text-[#C23B3B]">
                                            {run.remindersFailed}
                                        </td>
                                        <td className="px-5 py-3 text-[#1C3D3A99]">
                                            {run.completedAt
                                                ? `${Math.round(
                                                    (new Date(run.completedAt).getTime() -
                                                        new Date(run.startedAt).getTime()) /
                                                    1000,
                                                )}s`
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}