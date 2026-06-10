// apps/web/lib/api.client.ts

'use client';

import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(
    path: string,
    token: string | null,
    options: RequestInit = {},
): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message ?? 'Request failed');
    }

    return res.json();
}

// Hook — use this inside client components
export function useApi() {
    const { getToken } = useAuth();

    async function get<T>(path: string): Promise<T> {
        const token = await getToken();
        return request<T>(path, token);
    }

    async function post<T>(path: string, body: unknown): Promise<T> {
        const token = await getToken();
        return request<T>(path, token, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async function patch<T>(path: string, body: unknown): Promise<T> {
        const token = await getToken();
        return request<T>(path, token, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    return { get, post, patch };
}