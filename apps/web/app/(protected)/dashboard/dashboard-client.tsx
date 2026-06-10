// apps/web/app/(protected)/dashboard/dashboard-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, AgentRun } from '../../../lib/types';

function StatusBadge({ status }: { status: AgentRun['status'] }) {
    const styles: Record<AgentRun['status'], string> = {
        COMPLETED: 'bg-green-100 text-green-700',
        RUNNING: 'bg-blue-100 text-blue-700',
        FAILED: 'bg-red-100 text-red-700',
        PARTIAL: 'bg-yellow-100 text-yellow-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {status}
        </span>
    );
}

export default function DashboardClient({
    user,
    runs: initialRuns,
}: {
    user: User;
    runs: AgentRun[];
}) {
    const api = useApi()
    const [runs, setRuns] = useState(initialRuns);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const lastRun = runs[0];
    const totalSent = runs.reduce((sum, r) => sum + r.remindersSent, 0);
    const totalFailed = runs.reduce((sum, r) => sum + r.remindersFailed, 0);

    async function triggerAgent() {
        if (!user.clinicId) return;
        setLoading(true);
        setError('');
        try {
            await api.post(`/agent/run/${user.clinicId}/mock`, {});
            const updated = await api.get<AgentRun[]>(
                `/agent/runs?clinicId=${user.clinicId}`,
            );
            setRuns(updated);
        } catch (err: any) {
            setError(err.message ?? 'Agent run failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {user.clinic?.name ?? 'Your clinic'}
                    </p>
                </div>
                <button
                    onClick={triggerAgent}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Running...' : 'Run reminders now'}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total runs', value: runs.length },
                    { label: 'Reminders sent', value: totalSent },
                    { label: 'Failed', value: totalFailed },
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

            {/* Last run */}
            {lastRun && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h2 className="text-sm font-medium text-gray-700 mb-3">
                        Last run
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <StatusBadge status={lastRun.status} />
                        <span>
                            {new Date(lastRun.startedAt).toLocaleString('en-ZA', {
                                timeZone: 'Africa/Johannesburg',
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })}
                        </span>
                        <span>{lastRun.remindersAttempted} attempted</span>
                        <span className="text-green-600">{lastRun.remindersSent} sent</span>
                        {lastRun.remindersFailed > 0 && (
                            <span className="text-red-500">
                                {lastRun.remindersFailed} failed
                            </span>
                        )}
                    </div>
                    {lastRun.errorMessage && (
                        <p className="text-xs text-red-500 mt-2">{lastRun.errorMessage}</p>
                    )}
                </div>
            )}

            {/* Run history */}
            <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-medium text-gray-700">Run history</h2>
                </div>
                {runs.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">
                        No runs yet. Click "Run reminders now" to start.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                                <th className="px-5 py-3 font-medium">Time</th>
                                <th className="px-5 py-3 font-medium">Trigger</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Sent</th>
                                <th className="px-5 py-3 font-medium">Failed</th>
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
                                    <td className="px-5 py-3 text-gray-500">{run.triggeredBy}</td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={run.status} />
                                    </td>
                                    <td className="px-5 py-3 text-green-600">
                                        {run.remindersSent}
                                    </td>
                                    <td className="px-5 py-3 text-red-500">
                                        {run.remindersFailed}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}