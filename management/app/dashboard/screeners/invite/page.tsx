'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Send, User2, Users, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sendInvitations } from '@/lib/actions/screener-actions';
import { UserRole } from '@prisma/client';

// Form schema
const formSchema = z.object({
  emails: z.array(z.string().email({ message: "Invalid email address." }))
    .min(1, { message: 'Please add at least one email address.' }),
  message: z.string().optional(),
});

export default function InviteScreenersPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emails: [],
      message: 'We\'d like to invite you to become a screener for American Songwriter competitions. Please use the link below to sign up.',
    },
  });

  const handleAddEmail = () => {
    const emailValidation = z.string().email({ message: "Invalid email address." }).safeParse(currentEmailInput);
    if (emailValidation.success) {
      const currentEmails = form.getValues('emails');
      if (!currentEmails.includes(emailValidation.data)) {
        form.setValue('emails', [...currentEmails, emailValidation.data.trim()], { shouldValidate: true });
        setCurrentEmailInput('');
      } else {
        toast.info("Email already added.");
      }
    } else {
      toast.error(emailValidation.error.errors[0].message);
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const currentEmails = form.getValues('emails');
    form.setValue('emails', currentEmails.filter(email => email !== emailToRemove), { shouldValidate: true });
  };

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const emailList = values.emails; // emails is already an array
    
    if (emailList.length === 0) {
      // This check is technically redundant due to Zod schema min(1)
      // but good for belt-and-suspenders or if Zod wasn't used.
      toast.error('Please add at least one email address');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const { success, error } = await sendInvitations(emailList, UserRole.SCREENER, values.message);
      
      if (success) {
        toast.success(`Invitations sent to ${emailList.length} potential screeners`);
        form.reset(); 
        setCurrentEmailInput('');
        // Optionally redirect back to main screeners page
        // router.push('/dashboard/screeners');
      } else {
        toast.error('Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/screeners')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Screeners
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold">Invite Screeners</h1>
            <p className="text-muted-foreground">Send invitations to potential music screeners</p>
          </div>
        </div>
        
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Send Invitations
            </CardTitle>
            <CardDescription>
              Invite music professionals to join your team of screeners. They'll receive an email with instructions.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="emails"
                  render={({ field }) => ( // field is not directly used for input but for errors
                    <FormItem>
                      <FormLabel>Email Addresses</FormLabel>
                      <div className="flex space-x-2 items-start">
                        <Input
                          type="email"
                          placeholder="Enter an email address"
                          value={currentEmailInput}
                          onChange={(e) => setCurrentEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEmail();
                            }
                          }}
                          className="flex-grow"
                        />
                        <Button type="button" onClick={handleAddEmail} variant="outline" className="shrink-0">
                          Add
                        </Button>
                      </div>
                      <FormDescription>
                        Type an email and press Enter or click "Add".
                      </FormDescription>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {field.value.map((email, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center pl-2 pr-1 py-1">
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="ml-1.5 p-0.5 rounded-full hover:bg-muted-foreground/20"
                              aria-label={`Remove ${email}`}
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage /> 
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invitation Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter a personal message to include in the invitation"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Customize the message that will be sent with the invitation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                        Sending...
                      </> // Ensure closing tag is correct
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex flex-col items-start border-t pt-6">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Invitees will receive an email with a link to sign up as a screener</li>
              <li>They'll create an account and select their preferred music categories</li>
              <li>You'll need to approve their application before they can start screening</li>
              <li>Once approved, you can assign entries to them for review</li>
            </ul>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
