import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { apiClient } from '../../lib/api';

interface MeResponse {
  user?: {
    googleCalendarConnectedAt?: string | null;
  };
}

interface AuthUrlResponse {
  data?: { url?: string };
}

/**
 * Lets an admin connect (or reconnect) the Google Calendar account used for
 * interview-slot availability and booking (server/src/services/GoogleCalendarService.js).
 * Replaces manually calling GET /api/calendar/auth-url and opening the URL by hand.
 */
export function CalendarConnectCard() {
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const refreshStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await apiClient.get<MeResponse>('/auth/me', { skipCache: true });
      setConnectedAt(res?.user?.googleCalendarConnectedAt ?? null);
    } catch {
      // Non-fatal — card just shows "not connected" until the next refresh.
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await apiClient.get<AuthUrlResponse>('/calendar/auth-url', {
        skipCache: true,
      });
      const url = res?.data?.url;
      if (!url) {
        throw new Error('No auth URL returned');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.info('Complete sign-in in the new tab, then click "Refresh status" here.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not start Google Calendar connection'
      );
    } finally {
      setConnecting(false);
    }
  };

  const isConnected = Boolean(connectedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Google Calendar</CardTitle>
          </div>
          {!loadingStatus && (
            <Badge variant={isConnected ? 'success' : 'outline'}>
              {isConnected ? 'Connected' : 'Not connected'}
            </Badge>
          )}
        </div>
        <CardDescription>
          {isConnected
            ? `Interview availability and booking use this calendar. Connected ${new Date(
                connectedAt as string
              ).toLocaleString()}.`
            : 'Connect the calendar interview slots and bookings will use for candidate scheduling.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button onClick={handleConnect} disabled={connecting} size="sm">
          {isConnected ? 'Reconnect' : 'Connect'} Google Calendar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStatus}
          disabled={loadingStatus}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh status
        </Button>
        {isConnected && !loadingStatus && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
      </CardContent>
    </Card>
  );
}
