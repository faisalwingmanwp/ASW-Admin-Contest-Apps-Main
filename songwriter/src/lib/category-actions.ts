'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { getCurrentContestant } from './auth-actions';
import { Stripe } from 'stripe';

interface CategoryFormData {
  title: string;
  icon?: string;
}

interface AddCategoryParams {
  songId: string;
  categoryId: string;
  competitionId: string;
}

interface AddCategoryResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// export async function getCategories() {
//     return prisma.category.findMany({
//       include: {
//           entries: true,
//           songCategories: {
//           include: {
//               song: true,
//           },
//           },
//       },
//     });
// }

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: {
      title: 'asc'
    }
  });
}

export async function addCategoryToSong({ songId, categoryId, competitionId }: AddCategoryParams): Promise<AddCategoryResponse> {
  try {
    const contestant = await getCurrentContestant();
    
    if (!contestant) {
      return { 
        success: false, 
        error: "You must be logged in to add a category" 
      };
    }
    
    // Verify the song belongs to the contestant
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        entries: {
          some: {
            contestantId: contestant.id
          }
        }
      },
      include: {
        entries: {
          where: {
            contestantId: contestant.id
          },
          include: {
            product: true
          }
        }
      }
    });
    
    if (!song) {
      return { 
        success: false, 
        error: "Song not found or you don't have permission to modify it" 
      };
    }
    
    // Check if category already exists for this song
    const existingCategory = await prisma.songCategory.findUnique({
      where: {
        songId_categoryId: {
          songId,
          categoryId
        }
      }
    });
    
    if (existingCategory) {
      return { 
        success: false, 
        error: "This song is already entered in this category" 
      };
    }
    
    // Get competition details
    const competition = await prisma.competition.findUnique({
      where: {
        id: competitionId
      }
    });
    
    if (!competition) {
      return { 
        success: false, 
        error: "Contest not found" 
      };
    }
    
    if (!competition.open) {
      return { 
        success: false, 
        error: "This Contest is no longer open for entries" 
      };
    }
    
    // Get category details
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId
      }
    });
    
    if (!category) {
      return { 
        success: false, 
        error: "Category not found" 
      };
    }
    
    // Create Stripe checkout session for adding the category
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    
    // Find or create Stripe customer if contestant exists
    let stripeCustomerId = contestant.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: contestant.email || '',
        name: `${contestant.firstName || ''} ${contestant.lastName || ''}`.trim(),
        metadata: {
          contestantId: contestant.id,
          username: contestant.username
        }
      });
      
      stripeCustomerId = customer.id;
      
      await prisma.contestant.update({
        where: { id: contestant.id },
        data: { stripeCustomerId: customer.id }
      });
    }
    
    // Construct line item for the entry
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      adjustable_quantity: {
        enabled: false
      },
      price_data: {
        currency: 'usd',
        unit_amount: competition.price,
        product_data: {
          name: song.title,
          description: `Additional category: ${category.title} for ${song.title} in ${competition.name}`
        }
      }
    };
    
    // Create a new entry for tracking
    const product = song.entries[0]?.product;
    
    if (!product) {
      return { 
        success: false, 
        error: "Product information not found" 
      };
    }
    
    // Create a pending entry that will be marked as paid after successful payment
    const newEntry = await prisma.entry.create({
      data: {
        songId,
        categoryId,
        contestantId: contestant.id,
        productId: product.id,
        competitionId,
        paid: false // Will be updated to true after payment
      }
    });
    
    // Prepare rich metadata for the additional category purchase
    const submissionDate = new Date().toISOString();
    const baseMetadata: Record<string, string> = {
      contestantId: contestant.id,
      contestantEmail: contestant.email || '',
      competitionId,
      competitionName: competition.name,
      type: 'additional_category',
      product_id: product.id,
      submission_date: submissionDate,
      first_name: contestant.firstName || '',
      last_name: contestant.lastName || '',
      email: contestant.email || '',
      artist_name: song.artistName || '',
      co_writers: song.coWriters || '',
      song_title: song.title,
      song_categories: category.title,
      song_url: song.link || '',
      payment_status: 'pending',
      entry_count: '1',
    };

    baseMetadata.entryIds = JSON.stringify([newEntry.id]);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: 'payment',
      customer: stripeCustomerId,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/profile`,
      phone_number_collection: {
        enabled: true
      },
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true
      },
      payment_intent_data: {
        metadata: baseMetadata
      },
      metadata: baseMetadata
    });
    
    if (!session.url) {
      return { 
        success: false, 
        error: "Failed to create checkout session" 
      };
    }
    
    return { 
      success: true, 
      url: session.url 
    };
  } catch (error) {
    console.error('Error adding category to song:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}