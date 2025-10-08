"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createBrowserClient } from "@supabase/ssr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightIcon, CheckCircleIcon } from "lucide-react";
import { createClient } from "../../lib/supabase/server";
import { Button } from "../ui/button";

export default function SignUpPrompt({ email }: { email?: string | null }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSendLink = async () => {
        if (!email) return;
        
        setIsLoading(true);
        setError(null);

        try {
        const supabase = await createClient()

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
        setError("An unexpected error occurred. Please try again.");
        console.error("Login error:", err);
        } finally {
        setIsLoading(false);
        }
    };

    if (!email) return null;

    return (
        <Card className="mt-8">
        <CardHeader>
            <CardTitle>Access Your Submissions Anytime</CardTitle>
            <CardDescription>
            Create an account to track your contest entries and submit more songs in the future.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {error && (
            <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            )}

            {success ? (
            <div className="rounded-lg border p-6 space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="text-green-600 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Check your inbox</h3>
                <p className="text-muted-foreground">
                We've sent a magic link to <strong>{email}</strong>.<br/>
                Click the link in the email to sign in and access your dashboard.
                </p>
            </div>
            ) : (
            <div className="space-y-4">
                <p>
                We'll use the email you provided during checkout: <strong>{email}</strong>
                </p>
                <Button
                onClick={handleSendLink}
                className="w-full"
                disabled={isLoading}
                >
                {isLoading ? "Sending..." : "Send Magic Link"}
                {!isLoading && <ArrowRightIcon className="ml-2 h-4 w-4" />}
                </Button>
            </div>
            )}
        </CardContent>
        </Card>
    );
} 