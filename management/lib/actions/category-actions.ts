"use server"

import { revalidatePath } from "next/cache";
import prisma from "../db";
import { Category } from "@prisma/client";


export async function getCategories() {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { entries: true },
          },
        },
        orderBy: { title: 'asc' },
      });
  
      return { categories };
    } catch (error) {
      console.error("Error fetching categories:", error);
      return { error: "Failed to fetch categories" };
    }
}
  



/**
 * Get competition categories with entry counts
 *
 */
export type CategorySummary = {
  id: string;
  title: string;
  icon: string | null;
  entryCount: number;
};
export async function getCompetitionCategoriesWithCount(competitionId: string) {
  try {
    // Get categories with a count of entries for each
    const categories = await prisma.category.findMany({
      where: {
        entries: {
          some: {
            competitionId
          }
        }
      },
      select: {
        id: true,
        title: true,
        icon: true,
        _count: {
          select: {
            entries: {
              where: {
                competitionId
              }
            }
          }
        }
      }
    });

    const categoriesWithCounts: CategorySummary[] = categories.map(cat => ({
      id: cat.id,
      title: cat.title,
      icon: cat.icon,
      entryCount: cat._count.entries
    }));

    return { categories: categoriesWithCounts, error: null };
  } catch (error) {
    console.error("Error fetching competition categories:", error);
    return { categories: null, error: "Failed to fetch categories" };
  }
}


