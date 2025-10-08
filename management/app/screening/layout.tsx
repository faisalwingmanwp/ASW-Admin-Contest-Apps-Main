'use client'

import Link from 'next/link';
import { Toaster } from 'sonner';
import { 
  Home, 
  LogOut, 
  Music2, 
  Settings, 
  UserCircle, 
  Headphones, 
  BarChart2 
} from 'lucide-react';
import { logout } from '@/lib/actions/auth-actions';
import { getCurrentUser } from '@/lib/actions/screener-actions';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import SongWriterLogo from '@/components/ui/logo';
import { useEffect, useState } from 'react';

export default function ScreeningLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const { user, error } = await getCurrentUser();

      if (error || !user) {
        redirect("/auth/login");
      }

      if (user.role === UserRole.ADMIN) {
        redirect("/dashboard");
      } else if (user.role === UserRole.CONTESTANT || user.role === UserRole.FAN) {
        redirect("/");
      }

      setUser(user);
      setLoading(false);
    }

    fetchUser();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (user && !user.approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <SongWriterLogo width={120} height={120} />
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Approval Pending</h2>
            <p className="text-gray-600">
              Thank you for signing up as a screener! Your account is currently under review.
            </p>
            <p className="text-gray-600">
              An administrator needs to approve your account before you can access the screening panel.
              You'll receive a notification once your account has been approved.
            </p>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If you have any questions, please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <SongWriterLogo width={100} height={100} />
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link href="/screening" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <Home className="h-4 w-4 mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/screening/entries" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <Music2 className="h-4 w-4 mr-3" />
                Review Entries
              </Link>
            </li>
            <li>
              <Link href="/screening/profile" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                <UserCircle className="h-4 w-4 mr-3" />
                Profile
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button 
            className="flex w-full items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
          <div className="md:hidden">
            <SongWriterLogo width={32} height={32} />
          </div>
          <div className="flex items-center">
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
