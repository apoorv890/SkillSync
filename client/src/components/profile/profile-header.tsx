import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProfilePhotoUpload from "./ProfilePhotoUpload";

export default function ProfileHeader() {
  const { user, setUser } = useAuth();

  // Fetch and sync profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const profileData = data.data;
          
          // Update user context with latest profile data including photo
          if (user) {
            const updatedUser = { 
              ...user, 
              profilePhotoUrl: profileData.profilePhotoUrl,
              fullName: profileData.fullName,
              email: profileData.email
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []); // Run once on mount

  const handlePhotoUpdate = (photoUrl: string | null) => {
    if (user) {
      const updatedUser = { ...user, profilePhotoUrl: photoUrl };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!user) return null;

  const currentPhotoUrl = (user as any).profilePhotoUrl || null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <ProfilePhotoUpload
            currentPhotoUrl={currentPhotoUrl}
            userName={user.fullName || user.name || user.email}
            onPhotoUpdate={handlePhotoUpdate}
          />
          
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{user.fullName || user.name || 'User'}</h1>
              <Badge variant="secondary">{user.role === 'admin' ? 'HR Admin' : 'Candidate'}</Badge>
            </div>
            
            <div className="text-muted-foreground flex flex-col md:flex-row flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Mail className="size-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Calendar className="size-4" />
                <span>Joined {user.createdAt ? formatDate(user.createdAt) : 'Recently'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
