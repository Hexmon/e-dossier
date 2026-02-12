"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DossierDetail {
  label: string;
  value: string;
  editable: boolean;
}

interface DossierSectionProps {
  title: string;
  details: DossierDetail[];
  status: "completed" | "in-progress" | "pending";
}

export default function DossierSection({
  title,
  details,
  status,
}: DossierSectionProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/15 text-success border-success/30";
      case "in-progress":
        return "bg-primary/10 text-primary border-primary/30";
      case "pending":
        return "bg-warning/20 text-warning-foreground border-warning/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <Card className="border-border/50 hover:shadow-md transition-all duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <Badge variant="outline" className={getStatusColor(status)}>
            {status.replace("-", " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details.map((detail, index) => (
            <div key={index} className="space-y-2">
              <Label
                htmlFor={`detail-${index}`}
                className="text-sm font-medium text-muted-foreground"
              >
                {detail.label}
              </Label>

              {detail.editable ? (
                <Input
                  id={`detail-${index}`}
                  value={detail.value}
                  placeholder={`Enter ${detail.label.toLowerCase()}`}
                  className="text-sm"
                />
              ) : (
                <div className="p-2 bg-muted rounded-md text-sm text-foreground/80">
                  {detail.value || "Not set"}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
