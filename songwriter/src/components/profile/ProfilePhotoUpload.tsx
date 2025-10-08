'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Camera, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

// We'll dynamically import heic2any on the client side only
let heic2any: any = null;

interface ProfilePhotoUploadProps {
  currentPhoto: string | null;
  userId: string;
  onPhotoChange: (photoPath: string) => Promise<void>;
}

export default function ProfilePhotoUpload({ 
  currentPhoto, 
  userId,
  onPhotoChange 
}: ProfilePhotoUploadProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Dynamically import heic2any only on the client side
  useEffect(() => {
    import('heic2any').then(module => {
      heic2any = module.default;
    });
  }, []);

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
      
      // Upload the compressed file to Supabase
      const filePath = await uploadImage(compressedFile);
      if (filePath) {
        await onPhotoChange(filePath);
        toast.success('Profile photo updated successfully!', { id: 'image-processing' });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to update profile photo', { id: 'image-processing' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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

  // Upload image to Supabase
  const uploadImage = async (file: File) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User authentication required');
        throw new Error('User not authenticated');
      }
      
      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      // Include user ID in the path for RLS policies to work
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      return filePath;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image to server');
      throw err;
    }
  };

  return (
    <div 
      className="relative w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Current or preview image */}
      <img 
        src={imagePreview || currentPhoto || '/default.png'} 
        alt="Profile photo"
        className="object-cover rounded-full"
      />
      
      {/* Hover overlay */}
      <div 
        className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-200 rounded-full ${
          isHovering || isUploading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <label className="cursor-pointer flex flex-col items-center justify-center text-white w-full h-full">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="relative h-10 w-10 mb-1">
                <div className="absolute inset-0 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                  {uploadProgress}%
                </div>
              </div>
              <span className="text-xs font-bold">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="bg-red-600 rounded-full p-2 mb-1">
                <Camera className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-bold">Edit</span>
            </div>
          )}
          <Input 
            type="file" 
            accept="image/*,.heic,.heif" 
            onChange={handleImageChange} 
            className="hidden" 
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
} 