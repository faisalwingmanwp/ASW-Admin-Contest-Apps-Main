import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login | American Songwriter Contests",
  description: "Log in to your American Songwriter Contests account",
};

type Props = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
    const params = await searchParams;
  
  // Check if user is already logged in
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    // If they're already logged in, redirect them
    if (data.user) {
        redirect(params.redirectTo || "/profile");
    }

    return (
        <div className="w-full">
            <Card className="border-0 shadow-none">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold">Log in to your account</CardTitle>
                    <CardDescription>
                        Enter your email to receive a verification code
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <LoginForm redirectTo={params.redirectTo} />
                        
                        <Link href="/checkout" className="text-center mt-6 space-y-1 text-sm text-gray-600">
                            <p>Don&apos;t have an account?</p>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 