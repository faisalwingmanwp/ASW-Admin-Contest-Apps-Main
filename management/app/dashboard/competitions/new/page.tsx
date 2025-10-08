"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createCompetition } from "@/lib/actions/competition/competition-actions";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Define the schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.string().refine(
    (date: string) => !isNaN(Date.parse(date)),
    { message: "Invalid start date" }
  ),
  endDate: z.string().refine(
    (date: string) => !isNaN(Date.parse(date)),
    { message: "Invalid end date" }
  ),
  price: z.coerce.number().min(0, "Price must be 0 or higher"),
  open: z.boolean().default(true),
  fanVotingEnabled: z.boolean().default(false)
});

// Extract the type from the schema
type FormValues = z.infer<typeof formSchema>;

export default function NewCompetitionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  // Get current date in YYYY-MM-DD format for default values
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      startDate: formatDateForInput(today),
      endDate: formatDateForInput(nextMonth),
      price: 25,
      open: true,
      fanVotingEnabled: false
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSaving(true);
    try {
      // Convert dollars to cents for storing in the database
      const priceCents = Math.round(values.price * 100);
      
      // The server will handle Stripe product/price creation automatically
      const { competition, error } = await createCompetition({
        name: values.name,
        description: values.description,
        price: priceCents,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        open: values.open,
        fanVotingEnabled: values.fanVotingEnabled
      });
      
      if (error) {
        throw new Error(error);
      }
      
      if (!competition) {
        throw new Error("Failed to create competition");
      }
      
      toast.success("Contest created", {
        description: "Your new contest has been created successfully."
      });
      
      // Redirect to the competition details page
      router.push(`/dashboard/competitions/${competition.id}`);
    } catch (err) {
      console.error("Error creating competition:", err);
      toast.error("Error", {
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard/competitions">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contests
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contest Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contest name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>
                        The price will automatically be synchronized with Stripe
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter competition description" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fanVotingEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Fan Voting</FormLabel>
                      <FormDescription>
                        When checked, this contest supports the Fan Voting competition. Contestants can enter the Fan Contest.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="open"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Contest Open</FormLabel>
                      <FormDescription>
                        When checked, the contest is open for new entries and voting
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  style={{ backgroundColor: '#D33F49' }}
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="mr-2 h-4 w-4" /> Create Contest
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
