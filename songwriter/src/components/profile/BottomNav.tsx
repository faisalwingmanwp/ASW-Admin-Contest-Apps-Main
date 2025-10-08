'use client';

import { ClockIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200">
      <div className="grid h-full max-w-lg grid-cols-2 mx-auto">
        <Link 
          href="/profile" 
          className={`inline-flex flex-col items-center justify-center px-5 ${
            isActive('/profile') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ClockIcon className="w-6 h-6 mb-1" />
          <span className="text-xs">Entries</span>
        </Link>
        <Link 
          href="/profile" 
          className={`inline-flex flex-col items-center justify-center px-5 ${
            isActive('/profile') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <UserIcon className="w-6 h-6 mb-1" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </div>
  );
} 