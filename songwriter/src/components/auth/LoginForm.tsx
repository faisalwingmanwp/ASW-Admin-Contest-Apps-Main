"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailIcon, ArrowRightIcon, CheckCircleIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "@radix-ui/react-label";
import { createClient } from "../../lib/supabase/client";
import { Button } from "../ui/button";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
        const supabase = await createClient()

        // Use OTP instead of magic link
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // No redirect needed as we'll handle verification on a separate page
            },
        });

        if (error) {
            setError(error.message);
            toast.error(error.message);
        } else {
            toast.success("Verification code sent!");
            router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
        }

        } catch (err) {
            const errorMessage = "An unexpected error occurred. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
            console.error("Login error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <MailIcon className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    disabled={isLoading}
                />
                </div>
            </div>

            <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full bg-[#D33F49] hover:bg-[#b22f3b] text-white"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                ) : (
                    <>
                        Send Verification Code
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </>
                )}
            </Button>
            </form>
        </div>
    );
} 