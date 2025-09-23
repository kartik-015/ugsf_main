'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';
import { GraduationCap, Users } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Always show login form, ignore signed-in banner.
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const goRegister = (role) => {
    // For new users go to register, after successful registration you redirect to onboarding from register page logic
    router.push(`/register?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      <div className="container mx-auto px-4 py-10 max-w-md">
        <motion.h1
          className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >Sign In</motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-white/20 shadow-xl"
        >
          <LoginForm />
          <div className="mt-8 border-t border-white/20 pt-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">New user? Register as:</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => goRegister('student')}
                className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              ><GraduationCap className="w-4 h-4" /> Student</motion.button>
              <motion.button
                onClick={() => goRegister('guide')}
                className="p-3 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              ><Users className="w-4 h-4" /> Guide</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
