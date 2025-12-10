import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ApplicationStatus = "Under Review" | "Shortlisted" | "Rejected" | "Hired";

interface ApplicationStatusDropdownProps {
  currentStatus: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus) => void;
  applicationId: string;
}

const statusOptions: ApplicationStatus[] = [
  "Under Review",
  "Shortlisted",
  "Rejected",
  "Hired",
];

export function ApplicationStatusDropdown({
  currentStatus,
  onStatusChange,
  applicationId,
}: ApplicationStatusDropdownProps) {
  const [status, setStatus] = React.useState<ApplicationStatus>(currentStatus);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    onStatusChange(newStatus);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-40 justify-between">
          {status}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => handleStatusChange(option)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{option}</span>
              {status === option && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
