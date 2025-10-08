import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { prisma } from '@/lib/db';
import { getCurrentContestant } from '@/lib/auth-actions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    // Get the current authenticated contestant
    const contestant = await getCurrentContestant();
    
    if (!contestant) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse body and validate competition
    const body = await req.json().catch(() => ({}));
    const competitionId = body?.competitionId as string | undefined;
    if (!competitionId) {
      return NextResponse.json({ error: 'Missing competitionId' }, { status: 400 });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.open) {
      return NextResponse.json({ error: 'Contest not found or not open' }, { status: 400 });
    }
    if (!competition.fanVotingEnabled) {
      return NextResponse.json({ error: 'Fan voting is not enabled for this contest' }, { status: 400 });
    }

    // Check if contestant already has a fan contest entry for this competition (or global legacy)
    const existingFanContest = await prisma.purchase.findFirst({
      where: {
        contestantId: contestant.id,
        product: { type: 'FAN_CONTEST' },
        competitionId: competitionId
      }
    });

    if (existingFanContest) {
      return NextResponse.json(
        { error: 'You already have Fan Favorite access for this contest' },
        { status: 400 }
      );
    }

    // Get the fan contest product
    const fanContestProduct = await prisma.product.findFirst({
      where: { type: 'FAN_CONTEST' }
    });

    if (!fanContestProduct) {
      return NextResponse.json(
        { error: 'Fan contest product not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let { stripeCustomerId } = contestant;

    if (!stripeCustomerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: contestant.email || undefined,
        name: `${contestant.firstName || ''} ${contestant.lastName || ''}`.trim() || undefined,
        metadata: {
          contestantId: contestant.id
        }
      });

      stripeCustomerId = customer.id;

      // Save the Stripe customer ID
      await prisma.contestant.update({
        where: { id: contestant.id },
        data: { stripeCustomerId }
      });
    }

    // Create a Stripe Checkout session
    const amount = fanContestProduct.price;
    
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Fan Favorite Contest Entry',
              description: 'Unlock your artist profile and enable fan voting',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/membership?competitionId=${competitionId}`,
      automatic_tax: {
        enabled: true
      },
      payment_intent_data: {
        metadata: {
          contestantId: contestant.id,
          hasFanContest: 'true',
          type: 'fan-contest',
          productId: fanContestProduct.id,
          competitionId: competition.id,
          competitionName: competition.name
        }
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
