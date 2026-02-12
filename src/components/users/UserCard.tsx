"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, ShieldAlert, Ban, Trash2, Edit3, Eye } from "lucide-react";

interface UserListItemProps {
  id?: string;
  username?: string;
  persNo?: string;
  rank?: string;
  fullName?: string;
  unit?: string;
  role?: string;
  status?: "active" | "suspended" | "disabled";
  onView?: (id?: string) => void;
  onEdit?: (id?: string) => void;
  onDelete?: (id?: string) => void;
  onClick?: () => void;
}

export const UserListItem = ({
  id,
  username,
  persNo,
  rank,
  fullName,
  unit,
  role,
  status,
  onView,
  onEdit,
  onDelete,
  onClick,
}: UserListItemProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return <UserCheck className="h-4 w-4 text-primary" />;
      case "suspended":
        return <ShieldAlert className="h-4 w-4 text-warning-foreground" />;
      default:
        return <Ban className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "suspended":
        return (
          <Badge variant="secondary" className="text-warning-foreground bg-warning/20">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">Disabled</Badge>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 border-b hover:bg-muted/40 cursor-pointer transition-colors"
    >
      {/* Left side info */}
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{fullName}</p>
          <p className="text-sm text-muted-foreground">
            {rank} • {persNo} • {unit} • {role}
          </p>
          <p className="text-xs text-muted-foreground">username: {username}</p>
        </div>
      </div>

      {/* Right side: badge + actions */}
      <div className="flex items-center gap-3">
        {getStatusBadge()}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(id);
            }}
            className="text-xs px-2"
            title="View"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(id);
            }}
            className="text-xs px-2"
            title="Edit"
            aria-label="Edit"
          >
            <Edit3 className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(id);
            }}
            className="text-xs px-2 text-destructive hover:text-destructive-foreground"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
