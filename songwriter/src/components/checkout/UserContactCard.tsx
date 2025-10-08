'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UserContactCardProps {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  phone?: string;
}

export default function UserContactCard({ 
  email, 
  firstName, 
  lastName, 
  userName,
  phone
}: UserContactCardProps) {
  return (
    <Card className="p-4 border border-gray-200 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">Contact Information</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[#D33F49] border-[#D33F49] hover:bg-[#D33F49]/5"
          onClick={() => window.location.href = '/profile'}
        >
          Edit Profile
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#D33F49]/10 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D33F49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{firstName} {lastName}</p>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#D33F49]/10 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D33F49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Username</p>
            <p className="font-medium">@{userName}</p>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#D33F49]/10 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D33F49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{email}</p>
          </div>
        </div>

        {phone && (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#D33F49]/10 flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D33F49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{phone}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
