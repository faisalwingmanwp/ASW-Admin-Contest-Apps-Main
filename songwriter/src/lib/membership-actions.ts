'use server';

import { redirect } from "next/navigation"
import { createClient } from "./supabase/server"
import { prisma } from "./db"

export async function checkContestantHasMembership() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      redirect("/auth/login")
    }
    
    const contestant = await prisma.contestant.findUnique({
      where: { authId: user.id },
      include: {
        purchases: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!contestant) {
      return false
    }
    
    const hasMembership = contestant.purchases.some(
      purchase => purchase.product.type === 'FAN_CONTEST'
    )
    
    return hasMembership
}

export async function checkContestantHasMembershipBySlug(slug: string) {
  const contestant = await prisma.contestant.findUnique({
    where: { username: slug },
    include: {
      purchases: {
        include: {
          product: true
        }
      }
    }
  })
  
  if (!contestant) {
    return false
  }
  
  const hasMembership = contestant.purchases.some(
    purchase => purchase.product.type === 'FAN_CONTEST'
  )
  
  return hasMembership
}
 
/**
 * Returns a map of competitionId -> boolean indicating whether the
 * current contestant has a Fan Contest purchase for that competition.
 * If any legacy Fan Contest purchase exists without a competitionId,
 * treat it as global coverage (applies to all contests).
 */
export async function getFanContestMembershipMap() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { hasGlobal: false, byCompetition: {} as Record<string, boolean> }
  }

  const contestant = await prisma.contestant.findUnique({
    where: { authId: user.id },
    include: {
      purchases: {
        include: { product: true }
      }
    }
  })

  if (!contestant) {
    return { hasGlobal: false, byCompetition: {} as Record<string, boolean> }
  }

  const byCompetition: Record<string, boolean> = {}

  for (const p of contestant.purchases) {
    if (p.product?.type === 'FAN_CONTEST' && p.competitionId) {
      byCompetition[p.competitionId] = true
    }
  }

  return { hasGlobal: false, byCompetition }
}
  
