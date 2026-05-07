import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileHeader() {
  const { user, setUser } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const profileData = data.data;

          if (user) {
            const updatedUser = {
              ...user,
              profilePhotoUrl: profileData.profilePhotoUrl,
              fullName: profileData.fullName,
              email: profileData.email,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (!user) return null;

  const displayName = user.fullName || user.name || 'User';
  const currentPhotoUrl = user.profilePhotoUrl ?? null;
  const initials = getInitials(displayName || user.email || 'U');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <Avatar className="h-24 w-24 border-2 border-border">
            {currentPhotoUrl ? (
              <AvatarImage src={currentPhotoUrl} alt={displayName} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <Badge variant="secondary">{user.role === 'admin' ? 'HR Admin' : 'Candidate'}</Badge>
            </div>

            <p className="text-muted-foreground text-sm">
              Profile photo comes from your Google account when you sign in with Google.
            </p>

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
