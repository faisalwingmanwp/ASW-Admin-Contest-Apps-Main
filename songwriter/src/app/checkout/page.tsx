
import CheckoutForm from '../../components/checkout/CheckoutForm';
import { getAllCategories } from '@/lib/category-actions';
import { getCurrentContestant } from '@/lib/auth-actions';
import { getStandardProducts } from '@/lib/product-actions';
import { prisma } from '@/lib/db';
import { UserIcon } from 'lucide-react';
import SignOutButton from '@/components/auth/SignOutButton';

export default async function CheckoutPage() {
  const [categories, products] = await Promise.all([
    getAllCategories(),
    getStandardProducts()
  ]);
  const currentContestant = await getCurrentContestant();
  let profileImage = null;
  let userData = null;
  let fanContestAccess: { hasGlobal: boolean; byCompetition: Record<string, boolean> } | null = null;
  
  if (currentContestant) {
    // Get contestant's full profile including purchases
    const contestant = await prisma.contestant.findUnique({
      where: { id: currentContestant.id },
      include: {
        purchases: {
          include: {
            product: true
          }
        }
      }
    });

    if (contestant) {
      const hasMembership = contestant.purchases.some(
        purchase => purchase.product.type === 'MEMBERSHIP'
      );
      const hasFanContest = contestant.purchases.some(
        purchase => purchase.product.type === 'FAN_CONTEST'
      );

      // Build per-competition Fan Contest access map
      const byCompetition: Record<string, boolean> = {};
      for (const p of contestant.purchases) {
        if (p.product?.type === 'FAN_CONTEST' && p.competitionId) {
          byCompetition[p.competitionId] = true;
        }
      }
      fanContestAccess = { hasGlobal: false, byCompetition };

      userData = {
        email: contestant.email || '',
        // Use explicit first/last name fields from Prisma, not bio
        firstName: contestant.firstName || '',
        lastName: contestant.lastName || '',
        userName: contestant.username,
        hasMembership,
        hasFanContest,
        smsConsent: contestant.smsConsent
      };

      profileImage = contestant.profilePhoto 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${contestant.profilePhoto}`
      : '/default.png';
    }
  }
  
  return (
    <div>
      {currentContestant && <header className="border-b w-full px-4">
        <div className="container mx-auto pb-4 flex items-center justify-center">
          <div className="w-full max-w-screen-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt={currentContestant.username} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{currentContestant.username}</h2>
                <p className="text-sm text-muted-foreground">{currentContestant.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>}
      <CheckoutForm 
        categories={categories} 
        userData={userData}
        membershipProduct={products.membershipProduct}
        fanContestAccess={fanContestAccess}
      />
    </div>
  );
} 
