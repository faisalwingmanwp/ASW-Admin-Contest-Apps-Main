"use server";

import prisma from "../db";
import { ProductType } from "@prisma/client";
import { requireAdmin } from "./auth-guards";

type CreateFanContestPurchaseParams = {
  contestantId: string;
  competitionId: string;
  quantity?: number; // keep for future if needed
};

export async function createContestantFanContestPurchase({
  contestantId,
  competitionId,
  quantity = 1,
}: CreateFanContestPurchaseParams) {
  // Authorization check - only admins can create fan contest purchases
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    // Ensure the global FAN_CONTEST product exists
    const product = await prisma.product.findFirst({
      where: { type: ProductType.FAN_CONTEST },
    });

    if (!product) {
      return { error: "FAN_CONTEST product not found. Please create it in Product Settings." };
    }

    // If a FAN_CONTEST purchase already exists for this contestant+competition, return it
    const existing = await prisma.purchase.findFirst({
      where: {
        contestantId,
        competitionId,
        product: { type: ProductType.FAN_CONTEST },
      },
      include: { product: true, contestant: true, competition: true },
    });

    if (existing) {
      return { purchase: existing, alreadyExists: true };
    }

    // Create a purchase tied to the specific competition, attributed to the contestant
    const purchase = await prisma.purchase.create({
      data: {
        contestantId,
        productId: product.id,
        priceAtPurchase: product.price,
        quantity,
        competitionId,
      },
      include: {
        product: true,
        contestant: true,
        competition: true,
      },
    });

    return { purchase, alreadyExists: false };
  } catch (error: any) {
    console.error("Error creating fan contest purchase:", error);
    return { error: error.message || "Failed to create fan contest purchase" };
  }
}

export async function getFanContestPurchasesByCompetition(competitionId: string) {
  // Authorization check - only admins can view fan contest purchases
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return { error: auth.error };
  }

  try {
    const purchases = await prisma.purchase.findMany({
      where: {
        competitionId,
        product: { type: ProductType.FAN_CONTEST },
      },
      include: {
        contestant: true,
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { purchases };
  } catch (error: any) {
    console.error("Error fetching fan contest purchases:", error);
    return { error: error.message || "Failed to fetch purchases" };
  }
}
