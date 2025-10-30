import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

interface UserSectionCardsProps {
  stats: {
    totalApplications: number
    activeApplications: number
    acceptedApplications: number
    rejectedApplications: number
  }
}

export function UserSectionCards({ stats }: UserSectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Jobs Applied</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.totalApplications}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Pending Applications</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.activeApplications}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Accepted</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.acceptedApplications}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
        <CardHeader>
          <CardDescription>Rejected</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {stats.rejectedApplications}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
