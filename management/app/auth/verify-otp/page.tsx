'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { verifyOtp } from "@/lib/actions/auth-actions";
import { Loader2 } from "lucide-react";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

function VerifyOtpContent() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (!emailParam) {
      toast.error("No email provided");
      router.push("/auth/login");
      return;
    }
    setEmail(emailParam);
  }, [searchParams, router]);

  async function handleVerify() {
    if (otp.length !== 6) {
      toast.error("Please enter a complete 6-digit code");
      return;
    }

    setIsLoading(true);

    const result = await verifyOtp({ email, otp });

    if (result.error) {
      toast.error("Failed to verify OTP. Please try again.", {
        description: result.error
      });
    } else {
      toast.success("OTP verified successfully");
      router.push("/screening/entries");
    } 
    setIsLoading(false);
  }

  return (
    <div className="p-4 md:p-8 flex flex-col justify-center items-center min-h-screen">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#D33F49]">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-700">
            We've sent a 6-digit code to your email address. Enter the code below to verify your account.
          </p>
          {email && (
            <p className="mt-2 text-sm font-medium">
              Code sent to: <span className="text-[#D33F49]">{email}</span>
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isLoading}
            variant="default"
            size="lg"
            className="w-full bg-[#D33F49] hover:bg-[#b22f3b] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => router.push(`/auth/login?email=${email}`)}
              className="text-sm text-gray-600 hover:text-[#D33F49]"
            >
              Didn't receive a code? Try again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
