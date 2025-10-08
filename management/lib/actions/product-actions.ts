"use server";

import { revalidatePath } from "next/cache";
import prisma from "../db";
import Stripe from "stripe";
import { ProductType } from "@prisma/client";
import { requireAdmin } from "./auth-guards";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});

export type ProductWithDetails = {
  id: string;
  name: string;
  price: number;
  type: ProductType;
  stripePriceId: string;
  stripeProductId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductFormData = {
  name: string;
  price: number;
  type: ProductType;
};

// Get all products by type
export async function getProductsByType(types: ProductType[]) {
  try {
    const products = await prisma.product.findMany({
      where: {
        type: {
          in: types
        }
      },
      orderBy: { type: 'asc' }
    });

    return { products };
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return { error: error.message || "Failed to fetch products" };
  }
}

// Get or create a product
export async function getOrCreateProduct(data: ProductFormData) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Check if product of this type already exists
    const existingProduct = await prisma.product.findFirst({
      where: { type: data.type }
    });

    if (existingProduct) {
      return { product: existingProduct, created: false };
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(data.price * 100);

    // Create product in Stripe
    const stripeProduct = await stripe.products.create({
      name: data.name,
      description: `${data.type} product`,
      metadata: {
        type: data.type
      }
    });

    // Create price in Stripe
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
      metadata: {
        type: data.type
      }
    });

    // Create product in database
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: priceInCents,
        type: data.type,
        stripePriceId: stripePrice.id,
        stripeProductId: stripeProduct.id,
      },
    });

    revalidatePath("/dashboard/fan-voting");
    return { product, created: true };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { error: error.message || "Failed to create product" };
  }
}

// Update a product
export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return { error: "Product not found" };
    }

    if (!existingProduct.stripeProductId) {
      return { error: "Stripe product ID not found for this product" };
    }

    // Convert price to cents if price is being updated
    const priceInCents = data.price ? Math.round(data.price * 100) : existingProduct.price;
    
    // Update Stripe product if name changed
    if (data.name && data.name !== existingProduct.name) {
      await stripe.products.update(existingProduct.stripeProductId, {
        name: data.name,
        description: `${existingProduct.type} product`,
      });
    }

    // If price changed, create new price (prices can't be updated)
    let newStripePriceId = existingProduct.stripePriceId;
    if (data.price && priceInCents !== existingProduct.price) {
      const newStripePrice = await stripe.prices.create({
        product: existingProduct.stripeProductId,
        unit_amount: priceInCents,
        currency: 'usd',
        metadata: {
          type: existingProduct.type
        }
      });

      // Update the product to use the new price as default
      await stripe.products.update(existingProduct.stripeProductId, {
        default_price: newStripePrice.id
      });

      // Now we can safely archive the old price
      try {
        await stripe.prices.update(existingProduct.stripePriceId, {
          active: false
        });
      } catch (archiveError) {
        console.log('Could not archive old price, it might be in use:', archiveError);
        // Continue anyway, the new price is already set
      }

      newStripePriceId = newStripePrice.id;
    }

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: data.name || existingProduct.name,
        price: priceInCents,
        stripePriceId: newStripePriceId,
      },
    });

    revalidatePath("/dashboard/fan-voting");
    return { product: updatedProduct };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { error: error.message || "Failed to update product" };
  }
}

// Initialize default products
export async function initializeDefaultProducts() {
  // Authorization check
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const defaultProducts = [
      {
        name: "Fan Contest Entry",
        price: 5.00,
        type: ProductType.FAN_CONTEST
      },
      {
        name: "Membership",
        price: 39.00,
        type: ProductType.MEMBERSHIP
      },
      {
        name: "Song Entry",
        price: 25.00,
        type: ProductType.ENTRY
      }
    ];

    const results = [];
    
    for (const productData of defaultProducts) {
      const result = await getOrCreateProduct(productData);
      results.push(result);
    }

    return { success: true, results };
  } catch (error: any) {
    console.error("Error initializing default products:", error);
    return { error: error.message || "Failed to initialize default products" };
  }
} 