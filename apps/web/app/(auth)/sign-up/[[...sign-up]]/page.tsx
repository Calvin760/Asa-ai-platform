// apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: 'mx-auto',
                    },
                }}
            />
        </main>
    );
}