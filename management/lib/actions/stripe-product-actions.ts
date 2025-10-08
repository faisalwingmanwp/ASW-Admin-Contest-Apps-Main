"use server";

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Function to create a product in Stripe
export async function createStripeProduct(name: string, description?: string) {
  try {
    const product = await stripe.products.create({
      name,
      description: description || undefined,
    });
    
    return { productId: product.id };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw error;
  }
}

// Function to create a price for a product in Stripe
export async function createStripePrice(productId: string, unitAmount: number) {
  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmount, // Amount in cents
      currency: 'usd',
    });
    
    return { priceId: price.id };
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw error;
  }
}

// Function to update a product in Stripe
export async function updateStripeProduct(productId: string, name: string, description?: string) {
  try {
    const product = await stripe.products.update(productId, {
      name,
      description: description || undefined,
    });
    
    return { productId: product.id };
  } catch (error) {
    console.error('Error updating Stripe product:', error);
    throw error;
  }
}

// Function to create a new price for a product when the price changes
export async function updateProductPrice(productId: string, unitAmount: number) {
  try {
    // Stripe doesn't allow updating prices, so we create a new price and archive the old one
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmount, // Amount in cents
      currency: 'usd',
    });
    
    return { priceId: price.id };
  } catch (error) {
    console.error('Error updating Stripe product price:', error);
    throw error;
  }
}
