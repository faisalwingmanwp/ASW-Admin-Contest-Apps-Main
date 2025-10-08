'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateContestantProfile } from '@/lib/contestant-actions';

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestantId: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  bio: string | null;
  onSuccess: () => void;
}

export default function ProfileEditDialog({
  isOpen,
  onClose,
  contestantId,
  username: initialUsername,
  firstName: initialFirstName = '',
  lastName: initialLastName = '',
  bio: initialBio,
  onSuccess
}: ProfileEditDialogProps) {
  const [username, setUsername] = useState(initialUsername);
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  const [bio, setBio] = useState(initialBio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUsername(initialUsername);
      setFirstName(initialFirstName || '');
      setLastName(initialLastName || '');
      setBio(initialBio || '');
      setError(null);
      setUsernameError(null);
    }
  }, [isOpen, initialUsername, initialFirstName, initialLastName, initialBio]);

  const validateUsername = (value: string): string | null => {
    if (value.length === 0) {
      return 'Username is required';
    }
    
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    
    if (value.length > 30) {
      return 'Username must be less than 30 characters';
    }
    
    if (/\s/.test(value)) {
      return 'Username cannot contain spaces';
    }
    
    if (/[A-Z]/.test(value)) {
      return 'Username cannot contain uppercase letters';
    }
    
    if (/[^a-z0-9_]/.test(value)) {
      return 'Username can only contain lowercase letters, numbers, and underscores';
    }
    
    return null;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const validationError = validateUsername(formattedValue);
    setUsernameError(validationError);
    
    setUsername(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateUsername(username);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const updateData: any = {};

      if (username !== undefined) {
        updateData.username = username;
      }

      if (firstName !== undefined) {
        updateData.firstName = firstName || null;
      }
      
      if (lastName !== undefined) {
        updateData.lastName = lastName || null;
      }

      if (bio !== undefined) {
        updateData.bio = bio || null;
      }

      await updateContestantProfile(updateData);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your profile');
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name (optional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name (optional)"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
              <Input
                id="username"
                value={username}
                onChange={handleUsernameChange}
                className="pl-7"
                placeholder="username (lowercase letters, numbers, underscores)"
                required
              />
            </div>
            {usernameError ? (
              <p className="text-xs text-red-500">{usernameError}</p>
            ) : (
              <p className="text-xs text-gray-500">Only lowercase letters, numbers, and underscores are allowed</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself"
              rows={4}
            />
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !!usernameError}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

