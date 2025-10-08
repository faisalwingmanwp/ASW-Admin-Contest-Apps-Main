"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { Button } from "../ui/button";

export default function SignOutButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    
    const handleSignOut = async () => {
        setIsLoading(true);
        
        try {
        const supabase = await createClient()
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
        } catch (error) {
        console.error("Error signing out:", error);
        } finally {
        setIsLoading(false);
        }
    };
    
    return (
        <Button 
        onClick={handleSignOut} 
        variant="outline"
        disabled={isLoading}
        size="sm"
        className="gap-2"
        >
        {isLoading ? "Signing out..." : "Sign out"}
        <LogOutIcon size={16} />
        </Button>
    );
} 