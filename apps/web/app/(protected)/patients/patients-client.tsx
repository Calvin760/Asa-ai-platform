// apps/web/app/(protected)/patients/patients-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Patient } from '../../../lib/types';

function PatientModal({
    clinicId,
    onClose,
    onCreated,
    api,
}: {
    clinicId: string;
    onClose: () => void;
    onCreated: (p: Patient) => void;
    api: ReturnType<typeof useApi>;
}) {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dateOfBirth: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const patient = await api.post<Patient>('/patients', {
                ...form,
                clinicId,
                dateOfBirth: form.dateOfBirth || undefined,
                email: form.email || undefined,
            });
            onCreated(patient);
            onClose();
        } catch (err: any) {
            setError(err.message ?? 'Failed to create patient');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">
                    New patient
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                First name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Last name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+27821234567"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of birth
                        </label>
                        <input
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) =>
                                setForm({ ...form, dateOfBirth: e.target.value })
                            }
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
                            {loading ? 'Saving...' : 'Create patient'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function PatientsClient({
    user,
    initialPatients,
}: {
    user: User;
    initialPatients: Patient[];
}) {
    const api = useApi();
    const [patients, setPatients] = useState(initialPatients);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [searching, setSearching] = useState(false);

    async function handleSearch(q: string) {
        setSearch(q);
        if (!user.clinicId) return;

        if (!q.trim()) {
            setSearching(true);
            try {
                const all = await api.get<Patient[]>(
                    `/patients?clinicId=${user.clinicId}`,
                );
                setPatients(all);
            } finally {
                setSearching(false);
            }
            return;
        }

        setSearching(true);
        try {
            const results = await api.get<Patient[]>(
                `/patients/search?clinicId=${user.clinicId}&q=${encodeURIComponent(q)}`,
            );
            setPatients(results);
        } finally {
            setSearching(false);
        }
    }

    function handleCreated(patient: Patient) {
        setPatients((prev) => [patient, ...prev]);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    + New patient
                </button>
            </div>

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {searching ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">
                        Searching...
                    </p>
                ) : patients.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">
                        {search ? 'No patients found.' : 'No patients yet. Add your first patient.'}
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                                <th className="px-5 py-3 font-medium">Name</th>
                                <th className="px-5 py-3 font-medium">Phone</th>
                                <th className="px-5 py-3 font-medium">Email</th>
                                <th className="px-5 py-3 font-medium">Date of birth</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                                >
                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {p.firstName} {p.lastName}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">{p.phone}</td>
                                    <td className="px-5 py-3 text-gray-500">
                                        {p.email ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">
                                        {p.dateOfBirth
                                            ? new Date(p.dateOfBirth).toLocaleDateString('en-ZA')
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && user.clinicId && (
                <PatientModal
                    clinicId={user.clinicId}
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                    api={api}
                />
            )}
        </div>
    );
}