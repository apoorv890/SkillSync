import { useState, useEffect } from 'react';
import { Briefcase, Users, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useDashboardRefresh } from '../../contexts/DashboardContext';

const AdminDashboard = () => {
  const { refreshTrigger } = useDashboardRefresh();
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    totalApplications: 0,
    jobsByStatus: { active: 0, draft: 0, closed: 0 },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch dashboard stats from dedicated endpoint
        const response = await fetch('http://localhost:5000/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setStats({
            totalJobs: data.totalJobs || 0,
            activeJobs: data.activeJobs || 0,
            totalCandidates: data.totalCandidates || 0,
            totalApplications: data.totalCandidates || 0,
            jobsByStatus: data.jobsByStatus || {
              active: 0,
              draft: 0,
              closed: 0
            },
            recentActivity: (data.recentJobs || []).slice(0, 5).map(job => ({
              type: 'job_created',
              description: `${job.title} - ${job.candidateCount || 0} applicants`,
              timestamp: job.createdAt || new Date().toISOString()
            }))
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="mb-3">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's an overview of your recruitment activities.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Briefcase className="h-8 w-8 text-blue-500" />
              <p className="text-3xl font-bold">{stats.totalJobs}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <p className="text-3xl font-bold">{stats.activeJobs}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-purple-500" />
              <p className="text-3xl font-bold">{stats.totalCandidates}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Applicants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-orange-500" />
              <p className="text-3xl font-bold">{stats.totalApplications}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity - Temporarily disabled */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <JobStatusChart jobsByStatus={stats.jobsByStatus} />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity activities={stats.recentActivity} />
        </div>
      </div> */}
    </div>
  );
};

export default AdminDashboard;
