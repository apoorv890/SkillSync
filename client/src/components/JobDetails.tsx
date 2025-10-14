import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, Calendar, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import ApplyModal from './ApplyModal';
import ApplicantsList from './ApplicantsList';
import EditJobModal from './EditJobModal';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { useDashboardRefresh } from '../contexts/DashboardContext';
import { useApi } from '../hooks/useApi';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { triggerDashboardRefresh } = useDashboardRefresh();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState({ applied: false, status: null });
  const [withdrawing, setWithdrawing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Fetch job details with deduplication
  const { data: jobResponse, loading } = useApi<any>(`/jobs/${id}`, {
    refetchTrigger,
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const job = jobResponse?.data || jobResponse;

  // Check application status for non-admin users
  useEffect(() => {
    if (user && !isAdmin && id) {
      const checkApplicationStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/applications/job/${id}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const result = await response.json();
            const statusData = result.data || result;
            if (statusData && statusData.applied) {
              setApplicationStatus({ applied: true, status: statusData.status });
            }
          }
        } catch (error) {
          console.error('Error checking application status:', error);
        }
      };
      checkApplicationStatus();
    }
  }, [id, user, isAdmin]);

  const handleEditSuccess = () => {
    // Trigger refetch of job details
    setRefetchTrigger(prev => prev + 1);
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/applications/job/${id}/withdraw`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Application withdrawn successfully!');
        setApplicationStatus({ applied: false, status: null });
        // Trigger dashboard refresh
        triggerDashboardRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to withdraw application');
      }
    } catch (error) {
      toast.error('Failed to withdraw application. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="space-y-4 w-full max-w-4xl">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardContent className="space-y-6 p-8">
              <Skeleton className="h-12 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Job not found</h1>
        <Button onClick={() => navigate('/jobs')}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/jobs')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>

          <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">
                {job.title}
              </h1>
              <div className="flex flex-wrap gap-2">
                {job.location && (
                  <Badge variant="outline" className="px-3 py-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {job.location}
                  </Badge>
                )}
                <Badge 
                  variant={job.status === 'active' ? 'default' : 'secondary'}
                  className={`flex items-center gap-2 ${job.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  <span className="capitalize">{job.status}</span>
                </Badge>
              </div>
            </div>
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            
            {!isAdmin && job.status === 'active' && (
              <div className="flex gap-3">
                {applicationStatus.applied ? (
                  <>
                    <Badge className="px-4 py-2 text-base bg-green-500 hover:bg-green-600">
                      Applied - {applicationStatus.status}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="lg"
                          variant="destructive"
                          disabled={withdrawing}
                        >
                          {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently withdraw your application
                            for this job position and remove your resume from the applicant pool.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleWithdraw}>
                            Yes, Withdraw Application
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setApplyModalOpen(true)}
                  >
                    Apply Now
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-t my-6"></div>

          {/* Display Job Title, Location, Work Type, and Summary as regular text */}
          <div className="space-y-4 mb-6">
            {/* Job Title */}
            {job.title && (
              <div>
                <h3 className="text-sm font-medium mb-2">Job Title</h3>
                <p className="text-base whitespace-pre-wrap leading-relaxed">{job.title}</p>
              </div>
            )}

            {/* Location */}
            {job.location && (
              <div>
                <h3 className="text-sm font-medium mb-2">Location</h3>
                <p className="text-base whitespace-pre-wrap leading-relaxed">{job.location}</p>
              </div>
            )}

            {/* Work Type */}
            {job.workType && (
              <div>
                <h3 className="text-sm font-medium mb-2">Work Type</h3>
                <p className="text-base whitespace-pre-wrap leading-relaxed">{job.workType}</p>
              </div>
            )}

            {/* Job Summary - fallback to description for old jobs */}
            {(job.summary || job.description) && (
              <div>
                <h3 className="text-sm font-medium mb-2">Job Summary</h3>
                <p className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.summary || job.description}
                </p>
              </div>
            )}
          </div>

          {/* Accordion for remaining fields */}
          <Accordion type="single" collapsible className="w-full">
            {/* Key Responsibilities */}
            {job.keyResponsibilities && (
              <AccordionItem value="item-1">
                <AccordionTrigger>Key Responsibilities</AccordionTrigger>
                <AccordionContent className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.keyResponsibilities}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Required Skills - fallback to requirements for old jobs */}
            {(job.requiredSkills || job.requirements) && (
              <AccordionItem value="item-2">
                <AccordionTrigger>Required Skills</AccordionTrigger>
                <AccordionContent className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.requiredSkills || job.requirements}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Preferred Skills */}
            {job.preferredSkills && (
              <AccordionItem value="item-3">
                <AccordionTrigger>Preferred Skills (Good to Have)</AccordionTrigger>
                <AccordionContent className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.preferredSkills}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* About Company */}
            {job.aboutCompany && (
              <AccordionItem value="item-4">
                <AccordionTrigger>About the Company</AccordionTrigger>
                <AccordionContent className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.aboutCompany}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Compensation */}
            {job.compensation && (
              <AccordionItem value="item-5">
                <AccordionTrigger>Compensation & Benefits</AccordionTrigger>
                <AccordionContent className="text-base whitespace-pre-wrap leading-relaxed">
                  {job.compensation}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {job.createdAt && (
            <div className="flex items-center pt-4 border-t text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Posted on {new Date(job.createdAt).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && <ApplicantsList jobId={id} />}

      {applyModalOpen && (
        <ApplyModal
          jobId={id}
          jobTitle={job.title}
          onClose={() => setApplyModalOpen(false)}
          onSuccess={() => {
            setApplyModalOpen(false);
            setApplicationStatus({ applied: true, status: 'pending' });
          }}
        />
      )}

      {editMode && (
        <EditJobModal
          job={job}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSuccess={handleEditSuccess}
        />
      )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
