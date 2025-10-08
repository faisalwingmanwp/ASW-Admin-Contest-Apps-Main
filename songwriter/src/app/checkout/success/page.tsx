import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentContestant } from "@/lib/auth-actions";
import { Stripe } from 'stripe';
import { Button } from '../../../components/ui/button';
import { CheckCircle, ArrowRight, Music, Trophy, Mail, Receipt, Star, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CheckoutSuccessHandler from './CheckoutSuccessHandler';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

type PageProps = {
  searchParams: Promise<{ session_id?: string; free?: string; order_id?: string; entry_ids?: string }>
};

export default async function SuccessPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams?.session_id;
  const isFree = searchParams?.free === 'true' || sessionId === 'FREE_ENTRY';
  const orderIdParam = searchParams?.order_id;
  const entryIdsParam = searchParams?.entry_ids;
  
  if (!sessionId) {
    redirect('/checkout');
  }
  
  // Handle free entry case
  if (isFree) {
    const contestant = await getCurrentContestant();
    if (!contestant) {
      redirect('/auth/login');
    }

    // Prefer explicit order_id if provided
    let purchase: any = null;
    if (orderIdParam) {
      purchase = await prisma.purchase.findFirst({
        where: { id: orderIdParam, contestantId: contestant.id },
        include: {
          product: true
        }
      });
    }

    // Fallback: if purchase not found but entry_ids provided, build a pseudo-purchase view from entries
    let entriesFromIds: any[] = [];
    if (!purchase && entryIdsParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(entryIdsParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          entriesFromIds = await prisma.entry.findMany({
            where: { id: { in: parsed }, contestantId: contestant.id },
            include: { song: true, category: true, competition: true }
          });
        }
      } catch {}
    }

    if (!purchase && entriesFromIds.length === 0) {
      redirect('/checkout');
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto">
          <CheckoutSuccessHandler />
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Contest Entry Submitted Successfully!
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Your free contest entry has been submitted
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1 text-left">
                  <li>• Your entry will be reviewed by our team</li>
                  <li>• You'll receive email updates on your submission status</li>
                  <li>• Winners will be announced at the contest deadline</li>
                </ul>
              </div>
              
              <div className="text-left">
                <h4 className="font-semibold mb-2">Your Entries:</h4>
                {entriesFromIds.map((entry: any) => (
                  <div key={entry.id} className="border rounded p-3 mb-2 bg-white">
                    <div className="font-medium">{entry.song.title}</div>
                    <div className="text-sm text-gray-600">
                      {entry.category.title} • {entry.competition.name}
                    </div>
                    <div className="text-xs text-gray-500">Entry ID: {entry.id}</div>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="pt-6">
              <div className="w-full space-y-4">
                <Button asChild className="w-full bg-[#D33F49] hover:bg-[#C03540]">
                  <Link href="/">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Return to Home
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    let paymentIntentId = session.payment_intent as string | null;

    // In subscription mode, the payment intent lives on the latest invoice
    if (!paymentIntentId && session.mode === 'subscription') {
      const subscriptionId = session.subscription as string | null;
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const latestInvoiceId = typeof subscription.latest_invoice === 'string'
            ? subscription.latest_invoice
            : subscription.latest_invoice?.id;
          if (latestInvoiceId) {
            const invoice = await stripe.invoices.retrieve(latestInvoiceId);
            const piFromInvoice = invoice.payment_intent as string | Stripe.PaymentIntent | null;
            if (typeof piFromInvoice === 'string') {
              paymentIntentId = piFromInvoice;
            } else if (piFromInvoice && 'id' in piFromInvoice) {
              paymentIntentId = piFromInvoice.id;
            }
          }
        } catch (e) {
          // Best-effort; fall back to showing processing if PI still missing
        }
      }
    }

    if (!paymentIntentId) {
      // If in subscription mode, treat as processing rather than missing
      if (session.mode === 'subscription') {
        return (
          <div className="max-w-6xl mx-auto py-16 px-4">
            <Card className="max-w-xl mx-auto border-amber-200 bg-amber-50">
              <CardHeader className="text-center border-b border-amber-200 pb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Mail className="text-amber-600 w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-bold text-amber-800">Payment Processing</CardTitle>
                <CardDescription className="text-amber-700 mt-2">
                  Your payment is being finalized. This can take a moment.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 text-center">
                <p className="text-amber-700">
                  We’ll update your order as soon as Stripe confirms the invoice payment.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-amber-200 pt-6">
                <Link href="/">
                  <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    Return to Home
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        );
      }

      return (
        <div className="max-w-6xl mx-auto py-16 px-4">
          <Card className="max-w-xl mx-auto border-amber-200 bg-amber-50">
            <CardHeader className="text-center border-b border-amber-200 pb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Mail className="text-amber-600 w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-amber-800">Payment Information Missing</CardTitle>
              <CardDescription className="text-amber-700 mt-2">
                We couldn't find payment details for your session
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-amber-700">
                This could be due to an issue with the payment processing system.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-amber-200 pt-6">
              <Link href="/">
                <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                  Return to Home
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return (
        <div className="max-w-6xl mx-auto py-16 px-4">
          <Card className="max-w-xl mx-auto border-amber-200 bg-amber-50">
            <CardHeader className="text-center border-b border-amber-200 pb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Mail className="text-amber-600 w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-amber-800">Payment Processing</CardTitle>
              <CardDescription className="text-amber-700 mt-2">
                Your payment is still being processed
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="text-amber-700">
                We'll notify you by email once your payment is complete. This usually takes just a few moments.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-amber-200 pt-6">
              <Link href="/">
                <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                  Return to Home
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      );
    }
      
    const metadata = {
      ...session.metadata,
      ...paymentIntent.metadata
    };

    const contestantId = metadata?.contestantId;
    const competitionName = metadata?.competitionName || 'American Songwriter Contest';
    const orderId = metadata?.orderId;
    // Consolidate entryIds from metadata (handles chunked keys entryIds_1..entryIds_10)
    let entryIds: string[] = [];
    if (metadata?.entryIds) {
      try { entryIds = JSON.parse(metadata.entryIds as string); } catch {}
    } else {
      for (let i = 1; i <= 10; i++) {
        const key = `entryIds_${i}` as keyof typeof metadata;
        const val = metadata?.[key as string];
        if (val) {
          try {
            const chunk = JSON.parse(val as string);
            if (Array.isArray(chunk)) entryIds.push(...chunk);
          } catch {}
        }
      }
    }
    const hasMembership = metadata?.hasMembership === 'true';
    const hasFanContest = metadata?.hasFanContest === 'true';
    const type = metadata?.type;

    // Fetch detailed purchase information
    let purchasedItems: Array<{
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      type: 'song' | 'fan-contest' | 'membership';
      categories?: string[];
      competitionName?: string;
    }> = [];

    if (contestantId) {
      // Fetch song entries
      if (entryIds && entryIds.length > 0) {
        const ids = entryIds;
        const entries = await prisma.entry.findMany({
          where: {
            id: { in: ids },
            contestantId: contestantId
          },
          include: {
            song: {
              include: {
                songCategories: {
                  include: {
                    category: true
                  }
                }
              }
            },
            category: true,
            competition: true
          }
        });

        // Group entries by song
        const songGroups = entries.reduce((acc: any, entry) => {
          const songId = entry.song.id;
          if (!acc[songId]) {
            acc[songId] = {
              song: entry.song,
              categories: [],
              competitionName: entry.competition?.name || ''
            };
          }
          acc[songId].categories.push(entry.category.title);
          // Ensure competition name is set (in case of mixed data, last one wins)
          acc[songId].competitionName = entry.competition?.name || acc[songId].competitionName;
          return acc;
        }, {});

        // Add song entries to purchased items
        Object.values(songGroups).forEach((group: any) => {
          purchasedItems.push({
            title: group.song.title,
            subtitle: `${group.categories.length} ${group.categories.length === 1 ? 'category' : 'categories'}`,
            icon: <Music className="h-5 w-5 text-[#D33F49]" />,
            type: 'song',
            categories: group.categories,
            competitionName: group.competitionName
          });
        });
      }

      // Add Fan Contest if purchased
      if (hasFanContest || type === 'fan-contest') {
        purchasedItems.push({
          title: "Fan Favorite Contest",
          subtitle: "Fan voting enabled + $5,000 prize eligibility",
          icon: <Users className="h-5 w-5 text-blue-600" />,
          type: 'fan-contest',
          competitionName: competitionName
        });
      }

      // Add Membership if purchased
      if (hasMembership) {
        const discountPercent = 40;
        purchasedItems.push({
          title: `American Songwriter Membership (${discountPercent}% Off)`,
          subtitle: "Annual membership access + benefits - Special offer",
          icon: <Star className="h-5 w-5 text-purple-600" />,
          type: 'membership'
        });
      }
    }

    const currentContestant = await getCurrentContestant();
    const isAuthenticated = !!currentContestant;
    
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <CheckoutSuccessHandler />
        

        <div className="max-w-3xl mx-auto">
    {/* Next Steps & Account Access Combined Widget */}
          <Card className="mb-8 overflow-hidden p-6">
            <div className="space-y-4">
              {isAuthenticated ? (
                <>
                  <h2 className="text-2xl font-semibold">Go to your profile</h2>
                  
                  <p className="text-gray-600">
                    Thanks for your submission! Visit your profile to track your contest standings, manage your submissions, and connect with fans.
                  </p>
                  
                  <Link href="/profile">
                    <Button className="w-full bg-[#D33F49] hover:bg-[#C03540] text-white py-6 mt-4">
                      Go to My Profile <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold">It's time to create your profile</h2>
                  
                  <div>
                    <p><span className="font-medium">Use:</span> {metadata?.contestantEmail || 'your email address'}</p>
                  </div>
                  
                  <p className="text-gray-600">
                    With an American Songwriter profile you can: Track your contest standings, unlock future submissions, and help fans discover your music.
                  </p>
                  
                  <Link href={`/auth/login?redirectTo=%2Fprofile&email=${encodeURIComponent(metadata?.contestantEmail || '')}`}>
                    <Button className="w-full bg-[#D33F49] hover:bg-[#C03540] text-white py-6 mt-4">
                      Create My Profile <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </Card>
          
          {/* Success Card */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-green-50 py-8 px-6 text-center border-b border-green-200">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="text-green-600 w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">Submission Successful!</h1>
              <p className="text-green-700">
                Your payment has been confirmed and your entries are now in the contest.
              </p>
            </div>
            
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <Mail className="text-gray-500 w-5 h-5 mt-0.5" />
                <div>
                  <p className="text-gray-700">We've sent a receipt and confirmation to:</p>
                  <p className="font-medium">{metadata?.contestantEmail || 'your email address'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Trophy className="text-gray-500 w-5 h-5 mt-0.5" />
                <div>
                  <p className="text-gray-700">You've entered:</p>
                  <p className="font-medium">{competitionName}</p>
                </div>
              </div>
              
              {orderId && (
                <div className="flex items-start gap-3 mt-4">
                  <Receipt className="text-gray-500 w-5 h-5 mt-0.5" />
                  <div>
                    <p className="text-gray-700">Order ID:</p>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-md">{orderId}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Details */}
          {purchasedItems.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl">Your Purchase Details</CardTitle>
                <CardDescription>
                  Here's what you've successfully entered and purchased:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {purchasedItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200">
                      {item.icon}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.subtitle}</p>
                      {item.competitionName && (
                        <p className="text-xs text-gray-500 mt-0.5">Competition: {item.competitionName}</p>
                      )}
                      {item.categories && item.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.categories.map((category, catIndex) => (
                            <Badge key={catIndex} variant="outline" className="bg-red-50 text-red-700 border-red-100">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.type === 'fan-contest' && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                            <Trophy className="h-4 w-4" />
                            $5,000 Cash Prize + Benefits
                          </div>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>• American Songwriter magazine feature</li>
                            <li>• Social media spotlight</li>
                            <li>• Automatic finalist status for judge selection</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    );
  } catch (error) {
    console.error('Error processing success page:', error);
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <Card className="max-w-xl mx-auto border-red-200 bg-red-50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-red-800">Something went wrong</CardTitle>
            <CardDescription className="text-red-700 mt-2">
              We had trouble processing your payment confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-700 mb-6">
              Please contact our support team for assistance with your submission.
            </p>
            <Link href="/">
              <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
} 
