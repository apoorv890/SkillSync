import { useState, useEffect } from 'react'
import { SectionCards } from './section-cards'
import { AnalyticsChart } from './analytics-chart'
import { useDashboardRefresh } from '../../contexts/DashboardContext'
import { useApi } from '../../hooks/useApi'
import { Button } from '../ui/button'
import { Moon, Sun } from 'lucide-react'

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  totalApplications: number;
}

export function DashboardPage() {
  const { refreshTrigger } = useDashboardRefresh()
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })

  // Use API hook with automatic deduplication and caching
  const { data: statsData, loading } = useApi<any>(
    '/dashboard/stats',
    {
      refetchTrigger: refreshTrigger,
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  const stats: DashboardStats = {
    totalJobs: statsData?.totalJobs || 0,
    activeJobs: statsData?.activeJobs || 0,
    totalCandidates: statsData?.totalCandidates || 0,
    totalApplications: statsData?.totalCandidates || 0,
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
            <p className="text-muted-foreground">
              Here's an overview of your recruitment activities.
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
        <SectionCards stats={stats} />
        <div className="px-4 lg:px-6">
          <AnalyticsChart />
        </div>
      </div>
    </div>
  )
}
