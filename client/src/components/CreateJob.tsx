import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Briefcase, MapPin, FileText, List } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useDashboardRefresh } from '../contexts/DashboardContext';

const CreateJob = () => {
  const navigate = useNavigate();
  const { triggerRefresh } = useDashboardRefresh();
  const [bulletPoints, setBulletPoints] = useState({
    keyResponsibilities: false,
    requiredSkills: false,
    preferredSkills: false,
    compensation: false
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      location: '',
      workType: 'Full-time',
      status: 'active',
      summary: '',
      keyResponsibilities: '',
      requiredSkills: '',
      preferredSkills: '',
      aboutCompany: '',
      compensation: ''
    }
  });
  
  const status = watch('status');
  const workType = watch('workType');

  const toggleBulletPoints = (field) => {
    setBulletPoints(prev => ({ ...prev, [field]: !prev[field] }));
    const currentValue = watch(field);
    if (!bulletPoints[field]) {
      // Convert to bullet points
      const lines = currentValue.split('\n').filter(line => line.trim());
      const bulletText = lines.map(line => `• ${line.replace(/^[•\-\*]\s*/, '')}`).join('\n');
      setValue(field, bulletText);
    } else {
      // Remove bullet points
      const lines = currentValue.split('\n');
      const plainText = lines.map(line => line.replace(/^[•\-\*]\s*/, '')).join('\n');
      setValue(field, plainText);
    }
  };

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Job creation response:', result);
        
        // Extract job ID from response - handle multiple response formats
        const jobId = result.data?._id || result.data?.id || result._id || result.id || result.job?._id;
        
        if (jobId) {
          toast.success('Job posting created successfully!');
          // Trigger dashboard refresh to update stats
          triggerRefresh();
          // Small delay to ensure job is saved before navigation
          setTimeout(() => {
            navigate(`/jobs/${jobId}`);
          }, 100);
        } else {
          console.error('Could not extract job ID from response:', result);
          throw new Error('Job ID not returned from server');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create job');
      }
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job. Please try again.');
    }
  };


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

          <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Create New Job Posting</CardTitle>
              <CardDescription>
                Fill in the details below to create a new job opportunity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="title"
                  placeholder="e.g., Senior Software Engineer"
                  className="pl-10"
                  {...register('title', { required: 'Job title is required' })}
                />
              </div>
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., San Francisco, CA"
                  className="pl-10"
                  {...register('location', { required: 'Location is required' })}
                />
              </div>
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workType">Work Type *</Label>
                <Select value={workType} onValueChange={(value) => setValue('workType', value)}>
                  <SelectTrigger id="workType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Job Summary / Role Overview *</Label>
              <Textarea
                id="summary"
                placeholder="Provide a brief overview of the role and what makes this position exciting..."
                rows={4}
                {...register('summary', { required: 'Job summary is required' })}
              />
              {errors.summary && (
                <p className="text-sm text-destructive">{errors.summary.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="keyResponsibilities">Key Responsibilities *</Label>
                <Button
                  type="button"
                  variant={bulletPoints.keyResponsibilities ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleBulletPoints('keyResponsibilities')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Bullet Points
                </Button>
              </div>
              <Textarea
                id="keyResponsibilities"
                placeholder="List the main responsibilities and day-to-day tasks..."
                rows={6}
                {...register('keyResponsibilities', { required: 'Key responsibilities are required' })}
              />
              {errors.keyResponsibilities && (
                <p className="text-sm text-destructive">{errors.keyResponsibilities.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requiredSkills">Required Skills / Qualifications *</Label>
                <Button
                  type="button"
                  variant={bulletPoints.requiredSkills ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleBulletPoints('requiredSkills')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Bullet Points
                </Button>
              </div>
              <Textarea
                id="requiredSkills"
                placeholder="List the required skills, experience, education, and qualifications..."
                rows={6}
                {...register('requiredSkills', { required: 'Required skills are required' })}
              />
              {errors.requiredSkills && (
                <p className="text-sm text-destructive">{errors.requiredSkills.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="preferredSkills">Preferred Skills (Good to Have)</Label>
                <Button
                  type="button"
                  variant={bulletPoints.preferredSkills ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleBulletPoints('preferredSkills')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Bullet Points
                </Button>
              </div>
              <Textarea
                id="preferredSkills"
                placeholder="List any preferred or nice-to-have skills and qualifications..."
                rows={4}
                {...register('preferredSkills')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aboutCompany">About the Company</Label>
              <Textarea
                id="aboutCompany"
                placeholder="Tell candidates about your company, culture, and values..."
                rows={4}
                {...register('aboutCompany')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="compensation">Compensation & Benefits</Label>
                <Button
                  type="button"
                  variant={bulletPoints.compensation ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleBulletPoints('compensation')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Bullet Points
                </Button>
              </div>
              <Textarea
                id="compensation"
                placeholder="Describe the salary range, benefits, perks, and other compensation details..."
                rows={4}
                {...register('compensation')}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/jobs')}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Job Posting'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateJob;
