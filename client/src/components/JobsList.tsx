import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, MapPin, Plus, Filter, ChevronRight, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import FilterPanel from './FilterPanel';
import { useDashboardRefresh } from '../contexts/DashboardContext';
import { useApi } from '../hooks/useApi';

const JobCardSkeleton = () => (
  <Card>
    <CardContent className="space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </CardContent>
  </Card>
);

const JobsList = () => {
  const { refreshTrigger } = useDashboardRefresh();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    location: 'all',
  });

  // Use API hook with deduplication and caching
  const { data: jobsResponse, loading } = useApi<any>('/jobs', {
    refetchTrigger: refreshTrigger,
    cacheTime: 3 * 60 * 1000, // 3 minutes cache for jobs list
  });

  const jobs = useMemo(() => {
    if (!jobsResponse) return [];
    const jobsData = jobsResponse.data || jobsResponse;
    return Array.isArray(jobsData) ? jobsData : [];
  }, [jobsResponse]);

  const filterOptions = useMemo(() => {
    const departments = Array.from(new Set(jobs.map(j => j.department).filter(Boolean)));
    const locations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean)));
    
    return {
      departments: departments.map(d => ({ label: d, value: d })),
      locations: locations.map(l => ({ label: l, value: l })),
    };
  }, [jobs]);

  const filterConfig = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Draft', value: 'draft' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      id: 'department',
      label: 'Department',
      type: 'select',
      options: filterOptions.departments,
    },
    {
      id: 'location',
      label: 'Location',
      type: 'select',
      options: filterOptions.locations,
    },
  ];

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter - only search by job title
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = job.title?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all' && job.status !== filters.status) return false;
      if (filters.department && filters.department !== 'all' && job.department !== filters.department) return false;
      if (filters.location && filters.location !== 'all' && job.location !== filters.location) return false;
      return true;
    });
  }, [jobs, filters, searchQuery]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({
      status: 'all',
      department: 'all',
      location: 'all',
    });
  }, []);

  const hasActiveFilters = searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== null && v !== undefined);
  const activeFiltersCount = (searchQuery ? 1 : 0) + Object.values(filters).filter(v => v !== 'all' && v !== '' && v !== null).length;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Header Section */}
        <div className="flex justify-between items-start flex-wrap gap-4 px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Openings</h1>
            <p className="text-muted-foreground">
              Discover exciting opportunities and find your perfect role
            </p>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            {/* Search Bar */}
            <div className="relative min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Button */}
            <Button
              variant={hasActiveFilters ? 'default' : 'secondary'}
              onClick={() => setFilterOpen(!filterOpen)}
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="px-4 lg:px-6">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              filterConfigs={filterConfig}
              onClose={() => setFilterOpen(false)}
            />
          </div>
        )}

        <div className="px-4 lg:px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredJobs.length === 0 && jobs.length > 0 ? (
            <Card className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Filter className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">No jobs match your filters</h2>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filter criteria
              </p>
              <Button onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">No job postings yet</h2>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first job posting
              </p>
              <Button asChild>
                <Link to="/create-job">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Link>
              </Button>
            </Card>
          ) : (
            <>
              {/* Stats Bar */}
              <Card className="p-4 mb-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <h2 className="text-xl font-semibold">
                    {hasActiveFilters ? (
                      <>{filteredJobs.length} of {jobs.length} {jobs.length === 1 ? 'Position' : 'Positions'}</>
                    ) : (
                      <>{jobs.length} {jobs.length === 1 ? 'Position' : 'Positions'} Available</>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      {filteredJobs.filter(j => j.status === 'active').length} Active
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Jobs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <Link
                    key={job._id}
                    to={`/jobs/${job._id}`}
                    className="group"
                  >
                    <Card className="h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="space-y-4 pt-6">
                        <div className="flex justify-between items-center">
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                            <Briefcase className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                          </div>
                          <Badge
                            variant={
                              job.status === 'active' ? 'default' :
                              job.status === 'draft' ? 'secondary' :
                              'outline'
                            }
                            className={`flex items-center gap-1 ${
                              job.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                              job.status === 'draft' ? 'bg-yellow-500 hover:bg-yellow-600' :
                              ''
                            }`}
                          >
                            <span className="capitalize">{job.status}</span>
                          </Badge>
                        </div>

                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>

                        <div className="space-y-2">
                          {job.department && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span className="leading-tight">{job.department}</span>
                            </div>
                          )}
                          {job.location && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span className="leading-tight">{job.location}</span>
                            </div>
                          )}
                        </div>

                        {job.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {job.description}
                          </p>
                        )}
                      </CardContent>

                      <CardFooter className="border-t pt-4">
                        <Button variant="ghost" className="w-full justify-between group-hover:underline">
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsList;
