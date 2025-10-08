'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { sendInvitations } from '@/lib/actions/screener-actions'; // Re-using the refactored generic action
import { UserRole } from '@prisma/client';
import { ArrowLeftIcon, SendIcon, MailIcon, UserPlusIcon } from 'lucide-react';

export default function InviteTeamMemberPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.SCREENER); // Default role
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    toast.loading('Sending invitations...');

    const emailList = emails.split(/[,\s\n]+/).filter(email => {
      const trimmedEmail = email.trim();
      if (trimmedEmail === '') return false;
      
      // More flexible email validation that allows @savage.ventures and common domains
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(trimmedEmail);
    });

    if (emailList.length === 0) {
      toast.error('Please enter at least one valid email address.');
      setIsLoading(false);
      return;
    }
    if (!selectedRole) {
        toast.error('Please select a role for the invitation.');
        setIsLoading(false);
        return;
    }

    const { success, error, results } = await sendInvitations(emailList, selectedRole, message || undefined);

    setIsLoading(false);
    toast.dismiss();

    if (success) {
      toast.success(`Invitations sent successfully to ${emailList.length} email(s)!`);
      setEmails('');
      setMessage('');
      // Optionally redirect or update UI
      // router.push('/dashboard/screeners?tab=invited'); // Or the new team management page path
    } else {
      toast.error(`Failed to send invitations: ${error}`);
      console.error("Invitation sending results:", results);
    }
  };

  // Get UserRoles for the Select, excluding roles that typically aren't invited (e.g., UNVERIFIED, CONTESTANT, FAN)
  const rolesToExclude: UserRole[] = [UserRole.UNVERIFIED, UserRole.CONTESTANT, UserRole.FAN];
  const availableRoles = Object.values(UserRole).filter(role => 
    !rolesToExclude.includes(role)
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Back to Team Management
      </Button>

      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex items-center mb-6">
          <UserPlusIcon className="h-8 w-8 text-primary mr-3" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Invite New Team Member</h1>
            <p className="text-gray-500 mt-1">Send invitations to join your team in a specific role.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="emails" className="text-sm font-medium text-gray-700">
              Email Addresses
            </Label>
            <p className="text-xs text-gray-500 mb-1.5">Enter one or more email addresses, separated by commas, spaces, or new lines.</p>
            <Textarea
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com\nemail3@example.com"
              required
              className="min-h-[100px] focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium text-gray-700">Role for Invitation</Label>
            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)} required>
              <SelectTrigger className="w-full mt-1.5 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium text-gray-700">
              Optional Invitation Message
            </Label>
            <p className="text-xs text-gray-500 mb-1.5">This message will be included in the invitation email.</p>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g., We'd love for you to join our team as a Screener to help us review awesome new songs!"
              className="min-h-[80px] focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-dark text-white">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" /> Send Invitations
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 