"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";
import { AlertCircle, Loader2 } from "lucide-react";

interface MagicLinkButtonProps {
  email: string | null;
  children?: ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  disabled?: boolean;
}

export default function MagicLinkButton({ 
  email, 
  children, 
  className, 
  variant = "outline",
  disabled,
  ...props 
}: MagicLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendLink = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/profile`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) return null;

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleSendLink}
      disabled={isLoading || success || disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : success ? (
        <>
          Link Sent
        </>
      ) : error ? (
        <>
          <AlertCircle className="mr-2 h-4 w-4" />
          Try Again
        </>
      ) : (
        children || "Send Email Link"
      )}
    </Button>
  );
}
