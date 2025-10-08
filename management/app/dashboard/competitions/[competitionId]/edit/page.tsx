"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Archive } from "lucide-react";
import Link from "next/link";
import { getCompetition, updateCompetition, toggleCompetitionArchiveStatus } from "@/lib/actions/competition/competition-actions";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function EditCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.competitionId as string;
  
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      price: 25,
      open: true,
      fanVotingEnabled: false
    },
  });

  useEffect(() => {
    async function loadCompetition() {
      setLoading(true);
      try {
        const { competition: loadedCompetition, error } = await getCompetition(competitionId);
        
        if (error) {
          throw new Error(error);
        }
        
        if (!loadedCompetition) {
          throw new Error("Contest not found");
        }
        
        setCompetition(loadedCompetition);
        
        // Format dates for the date input (YYYY-MM-DD)
        const formatInputDate = (date: Date) => {
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        };
        
        // Update the form
        form.reset({
          name: loadedCompetition.name,
          description: loadedCompetition.description || "",
          startDate: formatInputDate(loadedCompetition.startDate),
          endDate: formatInputDate(loadedCompetition.endDate),
          price: loadedCompetition.price / 100, // Convert cents to dollars for display
          open: loadedCompetition.open,
          fanVotingEnabled: Boolean(loadedCompetition.fanVotingEnabled)
        });
      } catch (err) {
        console.error("Error loading competition:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadCompetition();
  }, [competitionId, form]);

  // Define submit handler with explicit type annotation
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSaving(true);
    try {
      // Convert dollars to cents for storing in the database
      const priceCents = Math.round(values.price * 100);
      
      // The server will handle Stripe product/price creation or updates internally
      const { competition: updatedCompetition, error } = await updateCompetition(competitionId, {
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
      
      toast.success("Contest updated", {
        description: "Your changes have been saved successfully."
      });
      
      // Redirect back to the competition details page
      router.push(`/dashboard/competitions/${competitionId}`);
    } catch (err) {
      console.error("Error updating competition:", err);
      toast.error("Error", {
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  const handleArchiveToggle = async () => {
    if (!competition) return;

    setArchiving(true);
    try {
      const result = await toggleCompetitionArchiveStatus(competition.id, !competition.archived);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`Contest successfully ${!competition.archived ? 'archived' : 'unarchived'}.`);
      router.push('/dashboard/competitions');
    } catch (err) {
      console.error("Error updating archive status:", err);
      toast.error("Error", {
        description: (err as Error).message,
      });
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/competitions/${competitionId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contest
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-8">Edit Contest</h1>

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

              <div className="flex justify-between items-center pt-6">
                <div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" type="button" disabled={saving || archiving} className={competition?.archived ? "bg-black" : "bg-[#D33F49]"}>
                        <Archive className="mr-2 h-4 w-4" />
                        {competition?.archived ? 'Unarchive' : 'Archive'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {competition?.archived
                            ? "This will make the contest visible and potentially active again, allowing new entries if within the date range."
                            : "Archiving this contest will hide it from the main list and prevent new entries. You can unarchive it later."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveToggle} disabled={archiving}>
                          {archiving ? "Processing..." : "Continue"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || archiving}
                    style={{ backgroundColor: '#D33F49' }}
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
