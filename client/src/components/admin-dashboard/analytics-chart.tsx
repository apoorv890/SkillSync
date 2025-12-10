import { useState, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "../ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart"
import { useDashboardRefresh } from "../../contexts/DashboardContext"
import { useApi } from "../../hooks/useApi"
import { cn } from "../../lib/utils"

interface AnalyticsData {
  date: string
  jobsCreated: number
  displayDate: string
}

type TimeRange = "90d" | "30d" | "7d"

const chartConfig = {
  jobsCreated: {
    label: "Jobs Created",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Get current date in user's timezone
const getCurrentDate = () => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

// Format date for display (e.g., "Dec 3")
const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// Format date for API (YYYY-MM-DD in local timezone)
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AnalyticsChart() {
  const { refreshTrigger } = useDashboardRefresh()
  const [timeRange, setTimeRange] = useState<TimeRange>("90d")

  // Use API hook with automatic deduplication and caching
  const { data: analyticsResponse, loading } = useApi<any>(
    '/analytics?range=90d',
    {
      refetchTrigger: refreshTrigger,
      cacheTime: 10 * 60 * 1000, // 10 minutes cache for analytics
    }
  )

  // Convert array to map for easy lookup
  const apiData: Record<string, number> = useMemo(() => {
    const dataMap: Record<string, number> = {}
    if (analyticsResponse?.data && Array.isArray(analyticsResponse.data)) {
      analyticsResponse.data.forEach((item: any) => {
        dataMap[item.date] = item.jobsCreated || 0
      })
    }
    return dataMap
  }, [analyticsResponse])

  // Calculate chart data based on selected time range
  const chartData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const data: AnalyticsData[] = []
    const today = getCurrentDate()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatDateForAPI(date)
      
      data.push({
        date: dateStr,
        jobsCreated: apiData[dateStr] || 0,
        displayDate: formatDisplayDate(date),
      })
    }

    return data
  }, [timeRange, apiData])

  const totalJobs = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.jobsCreated, 0)
  }, [chartData])

  const maxJobs = useMemo(() => {
    return Math.max(...chartData.map(item => item.jobsCreated), 1)
  }, [chartData])

  const getSubtitle = () => {
    switch (timeRange) {
      case "7d":
        return "Total for the last 7 days"
      case "30d":
        return "Total for the last 30 days"
      case "90d":
      default:
        return "Total for the last 3 months"
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Total Jobs Created</h2>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
            <p className="text-3xl font-bold mt-2">{totalJobs.toLocaleString()}</p>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-0">
            <button
              onClick={() => setTimeRange("90d")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-l-md transition-colors",
                timeRange === "90d"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Last 90 days
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                timeRange === "30d"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Last 30 days
            </button>
            <button
              onClick={() => setTimeRange("7d")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-r-md transition-colors",
                timeRange === "7d"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Last 7 days
            </button>
          </div>
        </div>

        {/* Chart Section */}
        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex justify-center items-center h-[300px]">
            <p className="text-muted-foreground">No data available for this time range</p>
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="fillJobsCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#94a3b8"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="#94a3b8"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillJobsCreated2" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#cbd5e1"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor="#cbd5e1"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={timeRange === "7d" ? 0 : 32}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  hide
                  domain={[0, maxJobs + Math.ceil(maxJobs * 0.2)]}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {payload[0].payload.displayDate}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].value} {payload[0].value === 1 ? 'job' : 'jobs'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Multiple area layers for depth effect */}
                <Area
                  dataKey="jobsCreated"
                  type="monotone"
                  fill="url(#fillJobsCreated2)"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={500}
                />
                <Area
                  dataKey="jobsCreated"
                  type="monotone"
                  fill="url(#fillJobsCreated)"
                  stroke="#64748b"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
