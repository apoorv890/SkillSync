import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, List } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { useDashboardRefresh } from '../contexts/DashboardContext';

const EditJobModal = ({ job, open, onClose, onSuccess }) => {
  const { triggerRefresh } = useDashboardRefresh();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulletPoints, setBulletPoints] = useState({
    keyResponsibilities: false,
    requiredSkills: false,
    preferredSkills: false,
    compensation: false
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: job?.title || '',
      location: job?.location || '',
      workType: job?.workType || 'Full-time',
      status: job?.status || 'active',
      summary: job?.summary || '',
      keyResponsibilities: job?.keyResponsibilities || '',
      requiredSkills: job?.requiredSkills || '',
      preferredSkills: job?.preferredSkills || '',
      aboutCompany: job?.aboutCompany || '',
      compensation: job?.compensation || '',
    },
  });

  const status = watch('status');
  const workType = watch('workType');

  useEffect(() => {
    if (job) {
      setValue('title', job.title);
      setValue('location', job.location);
      setValue('workType', job.workType || 'Full-time');
      setValue('status', job.status);
      setValue('summary', job.summary || '');
      setValue('keyResponsibilities', job.keyResponsibilities || '');
      setValue('requiredSkills', job.requiredSkills || '');
      setValue('preferredSkills', job.preferredSkills || '');
      setValue('aboutCompany', job.aboutCompany || '');
      setValue('compensation', job.compensation || '');
    }
  }, [job, setValue]);

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
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${job._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Job updated successfully!');
        triggerRefresh();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update job');
      }
    } catch (error) {
      toast.error('Failed to update job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Job Posting</DialogTitle>
          <DialogDescription>
            Update the job details below. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Job title is required' })}
              placeholder="e.g. Senior Software Engineer"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              {...register('location', { required: 'Location is required' })}
              placeholder="e.g. Remote, New York, etc."
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="workType">Work Type *</Label>
              <Select value={workType} onValueChange={(value) => setValue('workType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select work type" />
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
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Job Summary / Role Overview *</Label>
            <Textarea
              id="summary"
              {...register('summary', { required: 'Summary is required' })}
              placeholder="Provide a brief overview of the role..."
              rows={4}
              className="resize-none"
            />
            {errors.summary && (
              <p className="text-sm text-red-500">{errors.summary.message}</p>
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
              {...register('keyResponsibilities', { required: 'Key responsibilities are required' })}
              placeholder="List the main responsibilities..."
              rows={6}
              className="resize-none"
            />
            {errors.keyResponsibilities && (
              <p className="text-sm text-red-500">{errors.keyResponsibilities.message}</p>
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
              {...register('requiredSkills', { required: 'Required skills are required' })}
              placeholder="List the required skills..."
              rows={6}
              className="resize-none"
            />
            {errors.requiredSkills && (
              <p className="text-sm text-red-500">{errors.requiredSkills.message}</p>
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
              {...register('preferredSkills')}
              placeholder="List any preferred skills..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aboutCompany">About the Company</Label>
            <Textarea
              id="aboutCompany"
              {...register('aboutCompany')}
              placeholder="Tell candidates about your company..."
              rows={4}
              className="resize-none"
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
              {...register('compensation')}
              placeholder="Describe compensation and benefits..."
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobModal;
