'use server';

import { getAuthenticatedUser } from './actions';
import { prisma } from './db';
import { ContestantFormData } from './types';
import { revalidatePath } from 'next/cache';

export async function registerContestant(data: ContestantFormData) {
    const contestant = await prisma.contestant.create({
        data: {
          username: data.username,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          bio: data.bio || null,
          profilePhoto: data.profilePhoto || null,
        },
    });

    revalidatePath('/profile');
    return contestant;
}

export async function updateContestantProfile( data: ContestantFormData) {
    const user = await getAuthenticatedUser()

    const updateData: any = {};
    
    if (data.username !== undefined) {
        updateData.username = data.username;
    }
    
    if (data.firstName !== undefined) {
        updateData.firstName = data.firstName || null;
    }
    
    if (data.lastName !== undefined) {
        updateData.lastName = data.lastName || null;
    }
    
    if (data.bio !== undefined) {
        updateData.bio = data.bio || null;
    }
    
    if (data.profilePhoto !== undefined) {
        updateData.profilePhoto = data.profilePhoto;
    }
    
    const updatedContestant = await prisma.contestant.update({
        where: { authId: user.id },
        data: updateData,
    });

    revalidatePath('/profile');
    return updatedContestant;
}


export async function getCompleteContestant() {
    const user = await getAuthenticatedUser()
    
    return prisma.contestant.findFirst({
        where: { authId: user.id },
        include: {
        entries: {
            include: {
                song: true,
                category: true,
                votes: true,
                competition: true,
            },
        },
        },
    });
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  if (!username || username.length < 3) {
    return false;
  }
  
  const existingUser = await prisma.contestant.findFirst({
    where: {
      username: username
    }
  });
  
  return existingUser === null;
} 

/**
 * Check if an email exists in the system
 * @returns Object with exists flag and user data if found
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; userData?: any }> {
  if (!email || !email.includes('@')) {
    return { exists: false };
  }
  
  // Check if email exists in Contestant table
  const existingContestant = await prisma.contestant.findFirst({
    where: {
      email: email
    }
  });
  
  if (existingContestant) {
    return {  exists: true };
  }
  
  return { exists: false };
}