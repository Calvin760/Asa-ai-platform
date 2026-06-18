// apps/web/app/(protected)/reminders/reminders-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, ReminderLog, AgentRun } from '../../../lib/types';

const CHANNEL_STYLES: Record<string, string> = {
    WHATSAPP: 'bg-green-100 text-green-700',
    SMS: 'bg-blue-100 text-blue-700',
    EMAIL: 'bg-purple-100 text-purple-700',
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-500',
    SENT: 'bg-blue-100 text-blue-700',
    DELIVERED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    SKIPPED: 'bg-yellow-100 text-yellow-700',
};

const INTENT_STYLES: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    RESCHEDULE_REQUESTED: 'bg-yellow-100 text-yellow-700',
    UNCLEAR: 'bg-gray-100 text-gray-500',
};

function RunStatus({ status }: { status: AgentRun['status'] }) {
    const styles: Record<AgentRun['status'], string> = {
        COMPLETED: 'bg-green-100 text-green-700',
        RUNNING: 'bg-blue-100 text-blue-700',
        FAILED: 'bg-red-100 text-red-700',
        PARTIAL: 'bg-yellow-100 text-yellow-700',
    };
    return (
        <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
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
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
                <button
                    onClick={triggerAgent}
                    disabled={running}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {running ? 'Running...' : 'Run reminders now'}
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
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
                        className="bg-white border border-gray-200 rounded-xl p-5"
                    >
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                {(['logs', 'runs'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'logs' ? 'Reminder logs' : 'Agent runs'}
                    </button>
                ))}
            </div>

            {/* Reminder logs tab */}
            {activeTab === 'logs' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {logs.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-gray-400 text-center">
                            No reminders sent yet. Click “Run reminders now” to start.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
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
                                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                                    >
                                        <td className="px-5 py-3 font-medium text-gray-900">
                                            {log.appointment?.patient
                                                ? `${log.appointment.patient.firstName} ${log.appointment.patient.lastName}`
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">
                                            <div>
                                                {log.appointment?.appointmentType?.replace('_', ' ') ?? '—'}
                                            </div>
                                            <div className="text-xs text-gray-400">
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
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHANNEL_STYLES[log.channel] ??
                                                    'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {log.channel}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status] ??
                                                    'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {log.replyIntent ? (
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${INTENT_STYLES[log.replyIntent] ??
                                                        'bg-gray-100 text-gray-500'
                                                        }`}
                                                >
                                                    {log.replyIntent.replace('_', ' ')}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">
                                                    awaiting
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
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
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {runs.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-gray-400 text-center">
                            No agent runs yet.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
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
                                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                                    >
                                        <td className="px-5 py-3 text-gray-600">
                                            {new Date(run.startedAt).toLocaleString('en-ZA', {
                                                timeZone: 'Africa/Johannesburg',
                                                dateStyle: 'short',
                                                timeStyle: 'short',
                                            })}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">
                                            {run.triggeredBy}
                                        </td>
                                        <td className="px-5 py-3">
                                            <RunStatus status={run.status} />
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">
                                            {run.remindersAttempted}
                                        </td>
                                        <td className="px-5 py-3 text-green-600">
                                            {run.remindersSent}
                                        </td>
                                        <td className="px-5 py-3 text-red-500">
                                            {run.remindersFailed}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">
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