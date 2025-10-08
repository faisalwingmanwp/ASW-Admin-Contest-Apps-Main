"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import { registerContestant, updateContestantProfile, checkUsernameAvailability } from '@/lib/contestant-actions';
import { ContestantFormData } from '@/lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '@radix-ui/react-label';
import { Alert, AlertDescription } from '../ui/alert';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

type Props = {
  existingData?: any;
};

// We'll dynamically import heic2any on the client side only
let heic2any: any = null;

export default function ProfileSetupForm({ existingData }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState(existingData?.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'unavailable' | 'initial'>('initial');
  const [bio, setBio] = useState(existingData?.bio || '');
  const [firstName, setFirstName] = useState(existingData?.firstName || '');
  const [lastName, setLastName] = useState(existingData?.lastName || '');
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(existingData?.profilePhoto || undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(
    existingData?.profilePhoto 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/${existingData.profilePhoto}`
      : '/default.png'
  );
  
  // Dynamically import heic2any only on the client side
  useEffect(() => {
    import('heic2any').then(module => {
      heic2any = module.default;
    });
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Remove spaces as the user types
    const noSpacesValue = value.replace(/\s/g, '');
    
    if (value !== noSpacesValue) {
      setUsernameError('Username cannot contain spaces');
    } else {
      setUsernameError(null);
    }
    
    setUsername(noSpacesValue);
  };
  
  // Username availability check with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('initial');
      return;
    }

    // If this is an update and the username hasn't changed, it's available
    if (existingData?.username === username) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    
    const timer = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        setUsernameStatus(isAvailable ? 'available' : 'unavailable');
      } catch (error) {
        console.error('Failed to check username:', error);
        setUsernameStatus('unavailable');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [username, existingData?.username]);

  // Convert HEIC to JPEG
  const convertHEICtoJPEG = async (file: File): Promise<Blob> => {
    try {
      // If heic2any hasn't loaded yet, wait for it
      if (!heic2any) {
        const module = await import('heic2any');
        heic2any = module.default;
      }
      
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      }) as Blob;
      
      return convertedBlob;
    } catch (error) {
      console.error('Error converting HEIC to JPEG:', error);
      toast.error('Failed to convert HEIC image');
      throw error;
    }
  };

  // Compress image to reduce file size
  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1,              // Max file size in MB
        maxWidthOrHeight: 1920,    // Max width/height in pixels
        useWebWorker: true,        // Use web worker for better performance
        onProgress: (progress: number) => {
          setUploadProgress(Math.round(progress));
        }
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Return a File object with the original name
      return new File([compressedFile], file.name, {
        type: compressedFile.type
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to compress image');
      throw error;
    }
  };

  // Handle image selection from file input
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    toast.loading('Processing image...', { id: 'image-processing' });
    
    try {
      // Convert HEIC to JPEG if needed
      let processedFile = file;
      if (file.type.includes('heic') || file.type.includes('heif')) {
        toast.loading('Converting HEIC image...', { id: 'image-processing' });
        const blob = await convertHEICtoJPEG(file);
        processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpeg'), {
          type: 'image/jpeg'
        });
      }
      
      // Compress the image
      toast.loading('Compressing image...', { id: 'image-processing' });
      const compressedFile = await compressImage(processedFile);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
      
      // Save the compressed file for later upload
      setImageFile(compressedFile);
      toast.success('Image ready for upload', { id: 'image-processing' });
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image', { id: 'image-processing' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload image to Supabase
  const uploadImage = async () => {
    if (!imageFile) return undefined;
    
    try {
      toast.loading('Uploading image...', { id: 'image-upload' });
      const supabase = await createClient()
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User authentication required', { id: 'image-upload' });
        throw new Error("User not authenticated");
      }
      
      // Get file extension
      const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
      
      // Include user ID in the path for RLS policies to work
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
      return filePath;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image to server', { id: 'image-upload' });
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Form validation checks
    if (!username || username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      setError('Username must be at least 3 characters long');
      setIsLoading(false);
      return;
    }
    
    if (username.includes(' ')) {
      toast.error('Username cannot contain spaces');
      setError('Username cannot contain spaces');
      setIsLoading(false);
      return;
    }
    
    if (usernameStatus === 'unavailable') {
      toast.error('This username is already taken');
      setError('This username is already taken');
      setIsLoading(false);
      return;
    }
    
    if (usernameStatus === 'checking') {
      toast.error('Please wait while we check if the username is available');
      setError('Please wait while we check if the username is available');
      setIsLoading(false);
      return;
    }
    
    if (!bio || bio.trim().length < 10) {
      toast.error('Please provide a bio that is at least 10 characters long');
      setError('Please provide a bio that is at least 10 characters long');
      setIsLoading(false);
      return;
    }
    
    if (!firstName) {
      toast.error('First name is required');
      setError('First name is required');
      setIsLoading(false);
      return;
    }
    
    try {
      toast.loading('Saving your profile...', { id: 'profile-save' });
      
      // Upload image if there is one
      let photoUrl = profilePhoto;
      if (imageFile) {
        photoUrl = await uploadImage();
      }
      
      const formData: ContestantFormData = {
        username,
        bio,
        firstName,
        lastName,
        profilePhoto: photoUrl,
      };
      
      if (existingData?.id) {
        // Update existing profile
        await updateContestantProfile(formData);
        toast.success('Profile updated successfully!', { id: 'profile-save' });
      } else {
        // Create new profile
        await registerContestant(formData);
        toast.success('Profile created successfully!', { id: 'profile-save' });
      }
      
      // Redirect to dashboard
      router.push('/profile');
      router.refresh();
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while saving your profile';
      toast.error(errorMessage, { id: 'profile-save' });
      setError(errorMessage);
      console.error('Profile setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <div className="flex flex-col items-center mb-6">
          <div 
            className="w-32 h-32 mb-4 relative"
          >
            {/* Avatar with image or initials fallback */}
            <div className="w-full h-full border border-gray-200 rounded-lg overflow-hidden">
              <img 
                src={imagePreview ? imagePreview  : `/upload-images.svg`} 
                alt="Profile preview" 
                width={128}
                height={128}
                className={imagePreview ? "object-cover w-full h-full" : "w-full h-full"}
              />
            </div>
            
            {/* Hover overlay */}
            <label 
              htmlFor="profile-photo"
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-200 opacity-0 hover:opacity-100 cursor-pointer"
            >
              {isUploading ? (
                <div className="flex flex-col items-center text-white">
                  <div className="relative h-10 w-10 mb-1">
                    <div className="absolute inset-0 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                      {uploadProgress}%
                    </div>
                  </div>
                  <span className="text-xs">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white">
                  <Camera className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">{imagePreview ? 'Change Photo' : 'Add Photo'}</span>
                  <span className="text-[10px] mt-1 text-center opacity-80">JPEG, PNG, HEIC accepted</span>
                </div>
              )}
            </label>
            
            <input 
              type="file" 
              id="profile-photo" 
              accept="image/*,.heic,.heif" 
              onChange={handleImageChange} 
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <Input
            id="username"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Your username (no spaces allowed)"
            required
            className={`pr-10 ${usernameStatus === 'unavailable' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {usernameStatus === 'checking' && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
            {usernameStatus === 'available' && username.length >= 3 && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {usernameStatus === 'unavailable' && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        {usernameError && (
          <p className="text-sm text-red-500 mt-1">{usernameError}</p>
        )}
        {usernameStatus === 'unavailable' && (
          <p className="text-sm text-red-500 mt-1">This username is already taken</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
          placeholder="Tell us about yourself (minimum 10 characters)"
          required
          rows={4}
          className={`${!bio || bio.trim().length < 10 ? 'border-amber-300' : ''}`}
        />
        {!bio || bio.trim().length < 10 ? (
          <p className="text-sm text-amber-500 mt-1">{bio.length > 0 ? 'Bio must be at least 10 characters' : 'Bio is required'}</p>
        ) : null}
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !!usernameError || usernameStatus === 'checking' || usernameStatus === 'unavailable'}
      >
        {isLoading ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
} 