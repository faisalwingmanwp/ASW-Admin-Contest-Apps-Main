'use client';

import { logout } from "../../../lib/actions/auth-actions";
import { Button } from "../../../components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PendingPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    
    try {
      const result = await logout();
      
      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('An error occurred during logout');
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 flex flex-col justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-[#D33F49]">Account Pending</h1>
        <p className="text-gray-700 mb-8">
          Your account is pending approval. Please contact an administrator.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-yellow-800">Approval Required</h2>
            <p className="text-yellow-700">
              Thank you for signing up! Your account is currently under review by our administrators.
            </p>
            <p className="text-yellow-700">
              You'll receive a notification once your account has been approved and you can access the platform.
            </p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          disabled={isLoading}
          variant="outline"
          size="lg"
          className="w-full border-[#D33F49] text-[#D33F49] hover:bg-[#D33F49] hover:text-white"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin"><Loader2 /></span> Signing out...
            </>
          ) : (
            "Log Out"
          )}
        </Button>
        
        <p className="mt-8 text-center text-xs text-gray-500">
          If you have any questions, please contact support at{' '}
          <a href="mailto:support@example.com" className="underline">support@example.com</a>
        </p>
      </div>
    </div>
  );
}