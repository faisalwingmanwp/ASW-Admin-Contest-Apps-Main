'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogOut } from 'lucide-react';

export default function SignOutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function signOut() {
      try {
        setIsLoading(true);
        const supabase = await createClient();
        
        // Sign out the user
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          throw error;
        }
        
        // Redirect to login page after successful sign out
        router.push('/auth/login');
      } catch (err) {
        console.error('Error signing out:', err);
        setError('Failed to sign out. Please try again.');
        setIsLoading(false);
      }
    }
    
    signOut();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg border shadow-sm p-6 text-center">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-[#D33F49] animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-900">Signing out...</h2>
            <p className="text-gray-500">Please wait while we sign you out.</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Sign Out Failed</h2>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => router.push('/profile')}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
            >
              Return to Profile
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
