import { getCompleteContestant } from "@/lib/contestant-actions";
import { getAuthenticatedUser } from "@/lib/actions";
import { prisma } from "@/lib/db";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
    
  const partialContestant = await prisma.contestant.findFirst({
    where: { authId: user?.id },
    select: {
      id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        profilePhoto: true,
      }
    });
      
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Complete Your Profile</h1>
          <p className="mb-8 text-center text-gray-600">
            Please complete your profile information to continue. This will help fans find and support your music.
          </p>
          
          <ProfileSetupForm existingData={partialContestant || {
            email: user?.email
          }} />
        </div>
      </div>
    );
}