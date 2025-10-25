import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Moon, Sun } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useDashboardRefresh } from '../../contexts/DashboardContext';
import { UserSectionCards } from '../user-dashboard/user-section-cards';

const UserDashboard = () => {
  const { refreshTrigger } = useDashboardRefresh();
  const [stats, setStats] = useState({
    totalApplications: 0,
    activeApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    averageScore: 0,
    applicationsByStatus: { applied: 0, under_review: 0, accepted: 0, rejected: 0, withdrawn: 0 },
    recentApplications: []
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
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
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
            <p className="text-muted-foreground">
              Track your job applications and interview progress.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="shrink-0"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        {/* Metrics Grid */}
        <UserSectionCards stats={{
          totalApplications: stats.totalApplications,
          activeApplications: stats.activeApplications,
          acceptedApplications: stats.acceptedApplications,
          rejectedApplications: stats.rejectedApplications
        }} />

        {/* Application Status and Recent Activity */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">Recent Applications</h2>
              {stats.recentApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-sm text-muted-foreground">You haven't applied to any jobs yet.</p>
                  <Button
                    asChild
                  >
                    <Link to="/jobs" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Browse Jobs
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  {stats.recentApplications.filter(app => app.jobId).map((app) => (
                    <Link
                      key={app._id}
                      to={`/jobs/${app.jobId._id}`}
                      className="block"
                    >
                      <Card className="transition duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{app.jobId.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{app.jobId.location}</span>
                                <span>•</span>
                                <span>{app.jobId.workType}</span>
                              </div>
                            </div>
                            <Badge
                              variant={
                                app.status === 'Hired' || app.status === 'Shortlisted' ? 'default' :
                                app.status === 'Rejected' ? 'destructive' :
                                app.status === 'Under Review' ? 'secondary' :
                                app.status === 'withdrawn' ? 'outline' :
                                'secondary'
                              }
                              className={
                                app.status === 'Hired' || app.status === 'Shortlisted' 
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                                  : app.status === 'Rejected'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                  : app.status === 'Under Review'
                                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                  : ''
                              }
                            >
                              {app.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
