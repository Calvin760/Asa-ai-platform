// apps/web/app/(protected)/onboarding/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import type { Clinic, User } from '@/lib/types';
import { useApi } from '@/lib/api.client';

export default function OnboardingPage() {
    const router = useRouter();
    const { user: clerkUser } = useUser();
    const api = useApi();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!clerkUser) return;

        setLoading(true);
        setError('');

        try {
            // Step 1: Create the clinic
            const clinic = await api.post<Clinic>('/clinics', form);

            // Step 2: Get or create the DB user
            let dbUser: User;
            try {
                dbUser = await api.get<User>(`/users/clerk/${clerkUser.id}`);
            } catch {
                // User not in DB yet — create them now
                // This handles the case where the Clerk webhook is disabled
                dbUser = await api.post<User>('/users', {
                    email: clerkUser.emailAddresses[0]?.emailAddress,
                    clerkUserId: clerkUser.id,
                    firstName: clerkUser.firstName ?? undefined,
                    lastName: clerkUser.lastName ?? undefined,
                    role: 'ADMIN',
                });
            }

            // Step 3: Link clinic to user
            await api.patch(`/users/${dbUser.id}`, { clinicId: clinic.id });

            
            // Step 5: Navigate to dashboard
            // Use replace() so the back button doesn't return to onboarding
            router.replace('/dashboard');
            // Step 4: Force server components to re-fetch fresh data
            // Without router.refresh(), the layout still sees the old cached
            // user (clinicId = null) and bounces back to /onboarding
            router.refresh();


        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Set up your clinic
            </h1>
            <p className="text-gray-500 mb-8">
                This only takes a minute. You can update these details later.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinic name <span className="text-red-500">*</span>
                    </label>
                    <input
                        required
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Smile Dental Clinic"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                    </label>
                    <input
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
                        placeholder="info@yourclinic.co.za"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                    </label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="123 Main St, Johannesburg"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading || !form.name}
                    className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Setting up...' : 'Create clinic'}
                </button>
            </form>
        </div>
    );
}