'use client';

import Link from "next/link";
import { login, signInWithGoogle } from "../../../lib/actions/auth-actions";
import { Button } from "../../../components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    if (!email) {
      toast.error("Please enter your email");
      setIsLoading(false);
      return;
    }

    const result = await login({ email });
    
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsGoogleLoading(true);
      const result = await signInWithGoogle();
      if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An error occurred during Google sign in');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 flex flex-col justify-center items-center min-h-screen">
      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold mb-2 text-[#D33F49]">Welcome back</h1>
        <p className="text-gray-700 mb-8">
          Sign in to your account.
        </p>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#D33F49]"
              placeholder="Enter email address"
            />
            <p className="mt-1 text-sm text-gray-500">
              We'll send you a 6-digit code to verify your email.
            </p>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            variant="default"
            size="lg"
            className="w-full bg-[#D33F49] hover:bg-[#b22f3b] text-white"
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin"><Loader2 /></span> Sending...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </form>
        
        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}