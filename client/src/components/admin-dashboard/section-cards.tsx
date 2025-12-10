import { TrendingUp, TrendingDown, Briefcase, Users, FileText } from "lucide-react"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"

interface SectionCardsProps {
  stats: {
    totalJobs: number
    activeJobs: number
    totalCandidates: number
    totalApplications: number
  }
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Total Jobs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalJobs}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1">
              <Briefcase className="h-3 w-3" />
              All Positions
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total job postings
          </div>
          <div className="text-muted-foreground">
            Across all departments
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Active Jobs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.activeJobs}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              Open
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Currently accepting applications
          </div>
          <div className="text-muted-foreground">
            Ready for candidates
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Total Applicants</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalCandidates}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              Candidates
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total unique applicants
          </div>
          <div className="text-muted-foreground">
            Talent pool size
          </div>
        </CardFooter>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Applications</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalApplications}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              Submissions
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total applications received
          </div>
          <div className="text-muted-foreground">
            Awaiting review
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
