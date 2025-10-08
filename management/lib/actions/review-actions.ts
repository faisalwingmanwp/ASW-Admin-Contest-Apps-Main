"use server";

import { revalidatePath } from "next/cache";
import prisma from "../db";
import { ReviewStatus } from "@prisma/client";
import { createClient } from "../supabase/supabase-server";

export async function getAssignedEntries() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return { entries: [], error: "Not authenticated" };
    }
    
    const user = await prisma.users.findUnique({
      where: { id: authUser.id },
      include: {
        Screener: true
      }
    });
    
    if (!user || !user.Screener) {
      return { entries: [], error: "User is not a screener" };
    }
    
    const entryReviews = await prisma.entryReview.findMany({
      where: {
        screenerId: user.Screener.id,
        status: { 
          in: [ReviewStatus.PENDING_REVIEW]
        },
      },
      include: {
        Entry: {
          include: {
            song: true,
            category: true,
            contestant: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            votes: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, 
        { assignedAt: 'desc' }
      ]
    });
    
    const entries = entryReviews.map(({ Entry, ...review }) => ({
      ...review,
      entry: Entry,
    }));
    
    return { 
      entries, 
      error: null 
    };
  } catch (error: any) {
    console.error("Error fetching assigned entries:", error);
    return { entries: [], error: error.message || "Failed to fetch assigned entries" };
  }
}

// Type for scores
export type EntryScores = {
  overallScore?: number;
}

export async function updateEntryReview(
  reviewId: string, 
  status: ReviewStatus, 
  comments: string,
  scores?: EntryScores
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return { success: false, error: "Not authenticated" };
    }
    
    const entryReview = await prisma.entryReview.findUnique({
      where: { id: reviewId },
      include: {
        Screener: {
          include: {
            users: true
          }
        }
      }
    });
    
    if (!entryReview) {
      return { success: false, error: "Review not found" };
    }
    
    if (entryReview.Screener.users.id !== authUser.id) {
      return { success: false, error: "You are not authorized to update this review" };
    }
    
    const updatedReview = await prisma.entryReview.update({
      where: { id: reviewId },
      data: {
        status,
        notes: comments,
        reviewedAt: new Date(),
        ...(scores?.overallScore !== undefined && { overallScore: scores.overallScore }),
      }
    });
    
    revalidatePath('/screening/entries');
    
    return { 
      success: true, 
      review: updatedReview, 
      error: null 
    };
  } catch (error: any) {
    console.error("Error updating entry review:", error);
    return { 
      success: false, 
      error: error.message || "Failed to update entry review" 
    };
  }
}
