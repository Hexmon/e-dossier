"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Ban, UserCheck } from "lucide-react";

interface OCListItemProps {
  name: string;
  course: string;
  platoon?: string | null;
  status: "active" | "inactive" | "disabled" | "suspended";
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * A reusable Officer Cadet list item card for displaying
 * name, course, platoon, and current status.
 *
 * Ideal for dashboards, lists, or mobile layouts.
 */
export const OCListItem: React.FC<OCListItemProps> = ({
  name,
  course,
  platoon,
  status,
  onClick,
  children,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return <UserCheck className="h-4 w-4 text-primary" />;
      case "suspended":
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
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
          <Badge variant="secondary" className="text-yellow-800 bg-yellow-100">
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
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            Course: {course} • Platoon: {platoon}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {getStatusBadge()}
        {children && <div className="flex gap-2">{children}</div>}
      </div>
    </div>
  );
};
