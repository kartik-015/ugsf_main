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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-background dark:via-card dark:to-background relative overflow-hidden">
      <div className="container mx-auto px-4 py-10 max-w-md">
        <motion.h1
          className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >EvalProX</motion.h1>
        <p className="text-center text-sm text-muted-foreground mb-6">SGP Evaluation Portal</p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-sm bg-card/95 dark:bg-card/95 rounded-2xl p-8 border-2 border-border shadow-2xl"
        >
          <LoginForm />
          <div className="mt-8 border-t-2 border-border pt-6">
            <p className="text-center text-sm font-medium text-muted-foreground mb-4">New user? Register as:</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => goRegister('student')}
                className="p-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 border-primary-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              ><GraduationCap className="w-4 h-4" /> Student</motion.button>
              <motion.button
                onClick={() => goRegister('guide')}
                className="p-3 rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 border-secondary-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              ><Users className="w-4 h-4" /> Guide</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
