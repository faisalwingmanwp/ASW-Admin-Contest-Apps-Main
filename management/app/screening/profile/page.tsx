'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserRoundCog, Loader2, CheckCircle2 } from 'lucide-react';

import { getCategories } from '@/lib/actions/category-actions';
import { getScreenerProfile, updateScreenerProfile } from '@/lib/actions/screener-actions';

// Define schemas for form validation
const profileFormSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters.' }).optional().or(z.literal('')),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters.' }).optional().or(z.literal('')),
  bio: z.string().max(500, { message: 'Bio must not exceed 500 characters.' }).optional().or(z.literal('')),
  preferredCategories: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Category option type for multi-select
type CategoryOption = {
  value: string;
  label: string;
};

export default function ScreenerProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatar, setAvatar] = useState('/placeholder-avatar.jpg');
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  
  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      bio: '',
      preferredCategories: [],
    },
  });
  
  // Load profile and categories data
  useEffect(() => {
    async function loadProfileData() {
      setIsLoading(true);
      try {
        // Fetch profile data
        const { profile, error: profileError } = await getScreenerProfile();
        
        if (profileError) {
          toast.error(profileError);
          return;
        }
        
        if (profile) {
          // Set form values from profile
          form.reset({
            firstName: profile.users.first_name || '',
            lastName: profile.users.last_name || '',
            bio: profile.bio || '',
            preferredCategories: profile.Category?.map((cat: { id: string }) => cat.id) || [],
          });
          
          // Set avatar if available
          if (profile.avatarUrl) {
            setAvatar(profile.avatarUrl);
          }
        }
        
        // Fetch all available categories
        const { categories, error: categoriesError } = await getCategories();
        
        if (categoriesError) {
          toast.error(categoriesError);
          return;
        }
        
        if (categories) {
          // Transform categories for multi-select
          setCategoryOptions(categories.map(category => ({
            value: category.id,
            label: category.title,
          })));
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProfileData();
  }, [form]);
  
  // Handle form submission
  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    
    try {
      const { success, error } = await updateScreenerProfile(data);
      
      if (error) {
        toast.error(error);
        return;
      }
      
      if (success) {
        toast.success('Profile updated successfully');
        router.refresh();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }
  
  // Generate avatar fallback from name
  const getInitials = () => {
    const firstName = form.watch('firstName') || '';
    const lastName = form.watch('lastName') || '';
    
    if (!firstName && !lastName) return 'SC';
    if (firstName && !lastName) return firstName.charAt(0);
    if (!firstName && lastName) return lastName.charAt(0);
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4">      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={avatar} alt="Profile picture" />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-medium">
                  {form.watch('firstName') || form.watch('lastName') ? 
                    <>{form.watch('firstName') || ''} {form.watch('lastName') || ''}</> : 
                    <span className="text-gray-400">Screener</span>}
                </p>
                <p className="text-sm text-gray-500">Screener</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Profile form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about yourself and your musical background..."
                            className="resize-none min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief bio that describes your experience and qualifications as a screener.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="preferredCategories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Categories</FormLabel>
                        <FormControl>
                          <MultiSelect
                            placeholder="Select categories"
                            options={categoryOptions}
                            selected={field.value?.map(value => {
                              const option = categoryOptions.find(opt => opt.value === value);
                              return option || { value, label: value };
                            }) || []}
                            onChange={(selected: Option[]) => {
                              field.onChange(selected.map((item: Option) => item.value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Select the music categories that align with your expertise. This helps assign you relevant entries.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto" 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
