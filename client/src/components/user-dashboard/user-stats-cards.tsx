import { FileText, Clock, XCircle, Calendar } from "lucide-react"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"

interface UserStatsCardsProps {
  stats: {
    totalApplications: number
    pendingApplications: number
    rejectedApplications: number
    interviewsScheduled: number
  }
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Jobs Applied</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalApplications}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              Total Applications
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total job applications
          </div>
          <div className="text-muted-foreground">
            All submitted applications
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-yellow-500/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Pending Applications</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.pendingApplications}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
              <Clock className="h-3 w-3" />
              Under Review
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Awaiting response
          </div>
          <div className="text-muted-foreground">
            Currently being reviewed
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-red-500/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Rejected Applications</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.rejectedApplications}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400">
              <XCircle className="h-3 w-3" />
              Not Selected
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Applications declined
          </div>
          <div className="text-muted-foreground">
            Keep applying!
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-green-500/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Interviews Scheduled</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.interviewsScheduled}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
              <Calendar className="h-3 w-3" />
              Upcoming
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Interview opportunities
          </div>
          <div className="text-muted-foreground">
            Prepare for success
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
