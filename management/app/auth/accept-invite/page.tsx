'use client';

import Link from "next/link";
import { signup } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getCategories } from "@/lib/actions/category-actions";
import { Badge } from "@/components/ui/badge";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [invitedRole, setInvitedRole] = useState<UserRole>(UserRole.UNVERIFIED);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<{id: string; title: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    const roleFromQuery = searchParams.get('role') as UserRole;

    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setPrefillEmail(emailFromQuery);
    }
    if (roleFromQuery && Object.values(UserRole).includes(roleFromQuery)) {
      setInvitedRole(roleFromQuery);
      if (roleFromQuery === UserRole.SCREENER) {
        setShowCategorySelector(true);
      }
    } else if (roleFromQuery) {
      toast.error("Invalid invitation link: Role not specified correctly.");
    }

    if (roleFromQuery === UserRole.SCREENER) {
      const fetchCategories = async () => {
        const { categories, error } = await getCategories(); 
        if (error) {
          toast.error("Failed to load categories: " + error);
        } else {
          setAllCategories(categories || []);
        }
      };
      fetchCategories();
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    toast.loading('Processing your signup...');

    if (!email || !firstName || !lastName) {
      toast.error('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    if (!invitedRole || !Object.values(UserRole).includes(invitedRole)){
        toast.error('Invalid user role specified in invitation.');
        setIsLoading(false);
        return;
    }

    const result = await signup({
      email,
      firstName,
      lastName,
      preferredCategories: invitedRole === UserRole.SCREENER ? preferredCategories : undefined,
    });

    setIsLoading(false);
    toast.dismiss();

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Signup request sent! Check your email for verification.");
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setPreferredCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  const getRoleDisplayName = (role: UserRole) => {
    if (!role || role === UserRole.UNVERIFIED) return "Team Member";
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  return (
    <div className="p-4 md:p-8 flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-lg">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Link href="/">
              <img 
                src="https://contests.americansongwriter.com/_next/image?url=%2Fsongwriter-logo-black.png&w=256&q=75" 
                alt="American Songwriter" 
                className="mx-auto h-12 w-auto mb-4 md:h-16"
              />
            </Link>
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800">Join American Songwriter</CardTitle>
            <CardDescription className="text-gray-600">
              You have been invited to join as a {getRoleDisplayName(invitedRole)}.
              {prefillEmail && <p className="mt-1 text-sm text-green-600">Invited email: <strong>{prefillEmail}</strong></p>}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!prefillEmail}
                  required
                  className={prefillEmail ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
                
              {showCategorySelector && (
                <div className="space-y-2 pt-2">
                  <Label>Preferred Musical Categories (for Screeners) <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-gray-500">Please select at least one category you'd like to screen.</p>
                  {allCategories.length > 0 ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-1 max-h-48 overflow-y-auto border rounded-md p-3">
                        {allCategories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`category-${category.id}`}
                              checked={preferredCategories.includes(category.id)}
                              onCheckedChange={() => toggleCategory(category.id)}
                            />
                            <Label htmlFor={`category-${category.id}`} className="cursor-pointer text-sm font-normal">
                              {category.title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ): (
                        <p className="text-sm text-gray-400 italic">Loading categories...</p>
                    )}
                   {invitedRole === UserRole.SCREENER && preferredCategories.length === 0 && <p className="text-xs text-red-500 pt-1"></p>}
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white py-2.5"
                disabled={isLoading || (invitedRole === UserRole.SCREENER && preferredCategories.length === 0 && showCategorySelector)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Accept Invitation & Sign Up as ${getRoleDisplayName(invitedRole)}`
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col items-center space-y-2 border-t pt-6">
            <p className="text-sm text-gray-500">
              Already have an account? <Link href="/auth/login" className="text-primary hover:text-primary-dark underline">Log in</Link>
            </p>
             <p className="text-xs text-gray-500 text-center">
                By signing up, you acknowledge you are accepting an invitation for the role specified.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-8 flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-lg">
          <Card className="shadow-xl">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}