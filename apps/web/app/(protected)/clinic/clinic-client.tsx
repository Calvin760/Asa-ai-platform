// apps/web/app/(protected)/clinic/clinic-client.tsx

'use client';

import { useState } from 'react';
import { useApi } from '../../../lib/api.client';
import type { User, Clinic } from '../../../lib/types';

export default function ClinicClient({
    user,
    initialClinic,
}: {
    user: User;
    initialClinic: Clinic;
}) {
    const api = useApi();

    const [clinic, setClinic] = useState(initialClinic);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function handleChange(
        field: keyof Clinic,
        value: string
    ) {
        setClinic((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSave() {
        if (!user.clinicId) return;

        setSaving(true);
        setError('');

        try {
            const updated = await api.patch<Clinic>(
                `/clinics/${user.clinicId}`,
                clinic
            );

            setClinic(updated);
        } catch (err: any) {
            setError(err.message ?? 'Failed to update clinic');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Clinic Settings
                </h1>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="text-sm text-red-500">
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

                {/* Clinic Name */}
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Clinic name
                    </label>
                    <input
                        type="text"
                        value={clinic.name ?? ''}
                        onChange={(e) =>
                            handleChange('name', e.target.value)
                        }
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Phone
                    </label>
                    <input
                        type="text"
                        value={clinic.phone ?? ''}
                        onChange={(e) =>
                            handleChange('phone', e.target.value)
                        }
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        type="email"
                        value={clinic.email ?? ''}
                        onChange={(e) =>
                            handleChange('email', e.target.value)
                        }
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Address
                    </label>
                    <textarea
                        value={clinic.address ?? ''}
                        onChange={(e) =>
                            handleChange('address', e.target.value)
                        }
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Working hours (simple version) */}
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Working hours
                    </label>
                    {/* <input
                        type="text"
                        value={clinic.workingHours ?? ''}
                        onChange={(e) =>
                            handleChange('workingHours', e.target.value)
                        }
                        placeholder="e.g. 09:00 - 17:00"
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    /> */}
                </div>

            </div>
        </div>
    );
}