"use server";

import { revalidatePath } from "next/cache";
import prisma from "../db";
import Stripe from "stripe";
import { requireAdmin } from "./auth-guards";

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});

export type VotePackWithProduct = {
  id: string;
  quantity: number;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    stripePriceId: string;
    stripeProductId: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type VotePackFormData = {
  name: string;
  price: number;
  quantity: number;
};
  
// VotePack Actions
export async function getVotePacks() {
  try {
    const votePacks = await prisma.votePack.findMany({
      include: {
        product: true,
      },
      orderBy: { product: { price: 'asc' } },
    });

    return { votePacks };
  } catch (error: any) {
    console.error("Error fetching vote packs:", error);
    return { error: error.message || "Failed to fetch vote packs" };
  }
}
  
  export async function createVotePack(data: VotePackFormData) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Convert price to cents for Stripe (e.g., $15.99 → 1599 cents)
    const priceInCents = Math.round(data.price * 100);

    // 1. Create product in Stripe
    const stripeProduct = await stripe.products.create({
      name: data.name,
      description: `Vote pack with ${data.quantity} votes`,
      metadata: {
        type: 'VOTEPACK',
        quantity: data.quantity.toString()
      }
    });

    // 2. Create price in Stripe linked to the product
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
      metadata: {
        quantity: data.quantity.toString()
      }
    });

    // 3. Create product in database
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: priceInCents,
        type: "VOTEPACK",
        stripePriceId: stripePrice.id,
        stripeProductId: stripeProduct.id,
      },
    });

    // 4. Create vote pack linked to product
    const votePack = await prisma.votePack.create({
      data: {
        quantity: data.quantity,
        productId: product.id,
      },
      include: {
        product: true
      }
    });

    revalidatePath("/dashboard/fan-voting");
    revalidatePath("/dashboard/vote-packs");
    return { votePack };
  } catch (error: any) {
    console.error("Error creating vote pack:", error);
    return { error: error.message || "Failed to create vote pack" };
  }
}

export async function updateVotePack(id: string, data: VotePackFormData) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Get existing vote pack to find the product details
    const existingVotePack = await prisma.votePack.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!existingVotePack) {
      return { error: "Vote pack not found" };
    }

    if (!existingVotePack.product.stripeProductId) {
      return { error: "Stripe product ID not found for this vote pack" };
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(data.price * 100);
    
    // 1. Update Stripe product
    await stripe.products.update(existingVotePack.product.stripeProductId, {
      name: data.name,
      description: `Vote pack with ${data.quantity} votes`,
      metadata: {
        quantity: data.quantity.toString()
      }
    });

    // 2. Create a new price in Stripe (prices can't be updated, only archived)
    const newStripePrice = await stripe.prices.create({
      product: existingVotePack.product.stripeProductId,
      unit_amount: priceInCents,
      currency: 'usd',
      metadata: {
        quantity: data.quantity.toString()
      }
    });

    // 3. Archive the old price
    await stripe.prices.update(existingVotePack.product.stripePriceId, {
      active: false
    });

    // 4. Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id: existingVotePack.productId },
      data: {
        name: data.name,
        price: priceInCents,
        stripePriceId: newStripePrice.id,
      },
    });

    // 5. Update vote pack in database
    const updatedVotePack = await prisma.votePack.update({
      where: { id },
      data: {
        quantity: data.quantity,
      },
      include: {
        product: true
      }
    });

    revalidatePath("/dashboard/fan-voting");
    revalidatePath("/dashboard/vote-packs");
    return { votePack: updatedVotePack };
  } catch (error: any) {
    console.error("Error updating vote pack:", error);
    return { error: error.message || "Failed to update vote pack" };
  }
}

export async function deleteVotePack(id: string) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Get existing vote pack to find the product details
    const existingVotePack = await prisma.votePack.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!existingVotePack) {
      return { error: "Vote pack not found" };
    }

    if (!existingVotePack.product.stripeProductId) {
      return { error: "Stripe product ID not found for this vote pack" };
    }

    // 1. Archive the Stripe price
    await stripe.prices.update(existingVotePack.product.stripePriceId, {
      active: false
    });

    // 2. Extract product ID from price ID and archive the Stripe product
    await stripe.products.update(existingVotePack.product.stripeProductId, {
      active: false
    });

    // 3. Delete vote pack from database (will cascade delete associated product)
    await prisma.$transaction([
      prisma.votePack.delete({
        where: { id },
      }),
      prisma.product.delete({
        where: { id: existingVotePack.productId },
      }),
    ]);

    revalidatePath("/dashboard/fan-voting");
    revalidatePath("/dashboard/vote-packs");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting vote pack:", error);
    return { error: error.message || "Failed to delete vote pack" };
  }
}
  