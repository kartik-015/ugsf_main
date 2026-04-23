'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Always show login form, ignore signed-in banner.
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white">EvalProX</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">SGP Evaluation Portal</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-5 sm:p-8 shadow-sm">
          <LoginForm />
          <div className="mt-6 sm:mt-8 border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6 text-center">
            <p className="text-sm text-gray-500 mb-3">New user?</p>
            <button
              onClick={() => router.push('/register?role=student')}
              className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
}
