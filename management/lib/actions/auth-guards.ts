"use server";

import { UserRole } from "@prisma/client";
import { getCurrentUser } from "./screener-actions";

/**
 * Authorization guard for admin-only actions
 * Returns the user if authorized, or an error response
 */
export async function requireAdmin() {
  const { user, error } = await getCurrentUser();
  
  if (error || !user) {
    return { authorized: false as const, error: "Not authenticated" };
  }
  
  if (user.role !== UserRole.ADMIN && !user.isSuperAdmin) {
    return { authorized: false as const, error: "Unauthorized: Admin access required" };
  }
  
  return { authorized: true as const, user };
}

/**
 * Authorization guard for screener actions (allows screeners OR admins)
 * Returns the user if authorized, or an error response
 */
export async function requireScreenerOrAdmin() {
  const { user, error } = await getCurrentUser();
  
  if (error || !user) {
    return { authorized: false as const, error: "Not authenticated" };
  }
  
  if (user.role !== UserRole.SCREENER && user.role !== UserRole.ADMIN && !user.isSuperAdmin) {
    return { authorized: false as const, error: "Unauthorized: Screener or Admin access required" };
  }
  
  return { authorized: true as const, user };
}

/**
 * Authorization guard for actions that require any authenticated user
 * Returns the user if authenticated, or an error response
 */
export async function requireAuth() {
  const { user, error } = await getCurrentUser();
  
  if (error || !user) {
    return { authorized: false as const, error: "Not authenticated" };
  }
  
  return { authorized: true as const, user };
}

