import { useState, useEffect } from 'react'
import { UserStatsCards } from './user-stats-cards'
import { useDashboardRefresh } from '../../contexts/DashboardContext'
import { Button } from '../ui/button'
import { Moon, Sun } from 'lucide-react'

interface UserDashboardStats {
  totalApplications: number
  pendingApplications: number
  rejectedApplications: number
  interviewsScheduled: number
}

export function UserDashboardPage() {
  const { refreshTrigger } = useDashboardRefresh()
  const [stats, setStats] = useState<UserDashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
    interviewsScheduled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const token = localStorage.getItem('token')
        
        const response = await fetch('http://localhost:5000/api/dashboard/user-stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          setStats({
            totalApplications: data.totalApplications || 0,
            pendingApplications: data.pendingApplications || 0,
            rejectedApplications: data.rejectedApplications || 0,
            interviewsScheduled: data.interviewsScheduled || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserStats()
  }, [refreshTrigger])

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
              Here's an overview of your job applications.
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
        <UserStatsCards stats={stats} />
      </div>
    </div>
  )
}
