// apps/web/app/(protected)/appointments/appointments-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Appointment, Patient } from '../../../lib/types';

const APPOINTMENT_TYPES = [
    'CHECKUP',
    'CLEANING',
    'FILLING',
    'EXTRACTION',
    'ROOT_CANAL',
    'CROWN',
    'CONSULTATION',
    'EMERGENCY',
    'OTHER',
];

const STATUS_STYLES: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    NO_SHOW: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    RESCHEDULED: 'bg-yellow-100 text-yellow-700',
};

function AppointmentModal({
    clinicId,
    patients,
    onClose,
    onCreated,
    api,
}: {
    clinicId: string;
    patients: Patient[];
    onClose: () => void;
    onCreated: (a: Appointment) => void;
        api: ReturnType<typeof useApi>;
}) {
    const [form, setForm] = useState({
        patientId: '',
        appointmentType: 'CHECKUP',
        scheduledAt: '',
        durationMins: '30',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const appointment = await api.post<Appointment>('/appointments', {
                clinicId,
                patientId: form.patientId,
                appointmentType: form.appointmentType,
                scheduledAt: new Date(form.scheduledAt).toISOString(),
                durationMins: parseInt(form.durationMins),
                notes: form.notes || undefined,
            });
            onCreated(appointment);
            onClose();
        } catch (err: any) {
            setError(err.message ?? 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">
                    New appointment
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Patient <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={form.patientId}
                            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select a patient</option>
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.firstName} {p.lastName} — {p.phone}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={form.appointmentType}
                            onChange={(e) =>
                                setForm({ ...form, appointmentType: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {APPOINTMENT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date & time <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="datetime-local"
                            value={form.scheduledAt}
                            onChange={(e) =>
                                setForm({ ...form, scheduledAt: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (minutes)
                        </label>
                        <select
                            value={form.durationMins}
                            onChange={(e) =>
                                setForm({ ...form, durationMins: e.target.value })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[15, 30, 45, 60, 90, 120].map((m) => (
                                <option key={m} value={m}>
                                    {m} min
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Saving...' : 'Book appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AppointmentsClient({
    user,
    initialAppointments,
    patients,
}: {
    user: User;
    initialAppointments: Appointment[];
    patients: Patient[];
}) {
    const api = useApi();
    const [appointments, setAppointments] = useState(initialAppointments);
    const [showModal, setShowModal] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(false);

    async function applyFilters(date: string, status: string) {
        if (!user.clinicId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ clinicId: user.clinicId });
            if (date) params.set('date', date);
            if (status) params.set('status', status);
            const results = await api.get<Appointment[]>(
                `/appointments?${params.toString()}`,
            );
            setAppointments(results);
        } finally {
            setLoading(false);
        }
    }

    function handleDateChange(date: string) {
        setFilterDate(date);
        applyFilters(date, filterStatus);
    }

    function handleStatusChange(status: string) {
        setFilterStatus(status);
        applyFilters(filterDate, status);
    }

    function handleCreated(appointment: Appointment) {
        setAppointments((prev) => [appointment, ...prev]);
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    + New appointment
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All statuses</option>
                    {Object.keys(STATUS_STYLES).map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                {(filterDate || filterStatus) && (
                    <button
                        onClick={() => {
                            setFilterDate('');
                            setFilterStatus('');
                            applyFilters('', '');
                        }}
                        className="text-sm text-gray-400 hover:text-gray-600"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {loading ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">
                        Loading...
                    </p>
                ) : appointments.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">
                        No appointments found.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                                <th className="px-5 py-3 font-medium">Patient</th>
                                <th className="px-5 py-3 font-medium">Type</th>
                                <th className="px-5 py-3 font-medium">Date & time</th>
                                <th className="px-5 py-3 font-medium">Duration</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a) => (
                                <tr
                                    key={a.id}
                                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                                >
                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {a.patient
                                            ? `${a.patient.firstName} ${a.patient.lastName}`
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {a.appointmentType.replace('_', ' ')}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {new Date(a.scheduledAt).toLocaleString('en-ZA', {
                                            timeZone: 'Africa/Johannesburg',
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">
                                        {a.durationMins} min
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && user.clinicId && (
                <AppointmentModal
                    clinicId={user.clinicId}
                    patients={patients}
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                    api={api}
                />
            )}
        </div>
    );
}