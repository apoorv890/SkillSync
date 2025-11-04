import { useState, useRef, useEffect } from 'react';
import { Camera, X, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  userName: string;
  onPhotoUpdate: (photoUrl: string | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  userName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update photoUrl when currentPhotoUrl prop changes
  useEffect(() => {
    setPhotoUrl(currentPhotoUrl || null);
  }, [currentPhotoUrl]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, or WebP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image size must be less than 5MB';
    }
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('Uploading photo to:', 'http://localhost:5000/api/users/profile/photo');
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const response = await fetch('http://localhost:5000/api/users/profile/photo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      if (!data.success || !data.data?.profilePhotoUrl) {
        throw new Error('Invalid response from server');
      }

      // Update photo URL
      const uploadedUrl = data.data.profilePhotoUrl;
      console.log('Photo uploaded successfully! URL:', uploadedUrl);
      
      setPhotoUrl(uploadedUrl);
      setPreviewUrl(null);
      onPhotoUpdate(uploadedUrl);

      // Test if the image is accessible
      const img = new Image();
      img.onload = () => {
        console.log('✅ Image is publicly accessible');
      };
      img.onerror = () => {
        console.error('❌ Image is NOT accessible - likely S3 permissions issue');
        console.error('Please apply the S3 bucket policy from S3_BUCKET_POLICY.json');
      };
      img.src = uploadedUrl;

      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      setPreviewUrl(null);
      toast.error(error.message || 'Failed to upload profile photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile/photo', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete photo');
      }

      setPhotoUrl(null);
      onPhotoUpdate(null);

      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove profile photo');
    } finally {
      setIsUploading(false);
      setShowDeleteDialog(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || photoUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt={userName} className="object-cover" />
          ) : (
            <AvatarFallback className="text-4xl bg-primary/10">
              <User className="h-16 w-16 text-muted-foreground" />
            </AvatarFallback>
          )}
        </Avatar>

        {/* Upload Button */}
        <Button
          size="icon"
          variant="default"
          className="absolute -right-2 -bottom-2 h-10 w-10 rounded-full shadow-lg"
          onClick={triggerFileInput}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </Button>

        {/* Delete Button */}
        {photoUrl && !isUploading && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowDeleteDialog(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Upload JPG, PNG, or WebP (max 5MB)
        </p>
        {isUploading && (
          <p className="text-sm text-primary font-medium mt-1">Uploading...</p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile photo? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
