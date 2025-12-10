import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ApplicationStatusDropdown } from './ApplicationStatusDropdown';
import { toast } from 'sonner';
import { useApi } from '../hooks/useApi';

const ApplicantsList = ({ jobId }) => {
  const [downloadingResume, setDownloadingResume] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Fetch applicants with deduplication
  const { data: applicantsResponse, loading } = useApi<any>(
    `/applications/job/${jobId}/all`,
    {
      refetchTrigger,
      cacheTime: 2 * 60 * 1000, // 2 minutes cache
    }
  );

  const applicants = applicantsResponse?.data || applicantsResponse || [];

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Trigger refetch to get updated data
        setRefetchTrigger(prev => prev + 1);
        toast.success(`Application status changed to ${newStatus}`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update application status');
    }
  };

  const handleViewResume = async (applicationId) => {
    try {
      setDownloadingResume(applicationId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/applications/resume/${applicationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        const resumeUrl = result.data?.resumeUrl || result.resumeUrl;
        window.open(resumeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    } finally {
      setDownloadingResume(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const getScoreBadgeVariant = (score) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500 hover:bg-green-600';
    if (score >= 60) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-2xl">Applicants ({applicants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {applicants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No applications yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="font-medium text-foreground w-[20%]">Name</TableHead>
                <TableHead className="font-medium text-foreground w-[25%]">Email</TableHead>
                <TableHead className="font-medium text-foreground w-[15%]">ATS Score</TableHead>
                <TableHead className="font-medium text-foreground w-[15%]">Resume</TableHead>
                <TableHead className="font-medium text-foreground w-[25%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((app) => (
                <TableRow key={app._id} className="border-b last:border-0">
                  <TableCell className="font-medium py-3 align-middle">
                    {app.candidateName || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-3 align-middle">
                    {app.candidateEmail || 'N/A'}
                  </TableCell>
                  <TableCell className="py-3 align-middle">
                    {app.atsScore !== null && app.atsScore !== undefined ? (
                      <Badge 
                        variant="secondary"
                        className={`${getScoreColor(app.atsScore)} text-white border-0`}
                      >
                        {app.atsScore}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 border-0">
                        {app.atsStatus === 'pending' ? 'Analyzing...' : 
                         app.atsStatus === 'processing' ? 'Processing...' : 
                         app.atsStatus === 'failed' ? 'Failed' : 'N/A'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 align-middle">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewResume(app._id)}
                      disabled={downloadingResume === app._id}
                      className="h-8 px-3 flex items-center gap-2 border-0"
                    >
                      {downloadingResume === app._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="py-3 align-middle">
                    <ApplicationStatusDropdown
                      currentStatus={app.status || 'Under Review'}
                      onStatusChange={(newStatus) => handleStatusChange(app._id, newStatus)}
                      applicationId={app._id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicantsList;
