import React from "react";
import RelegationForm from "@/components/relegation/RelegationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RelegationManagementCard() {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader>
        <CardTitle>Relegation Management</CardTitle>
        <CardDescription>Transfer OCs between courses or repeat semesters</CardDescription>
      </CardHeader>
      <CardContent>
        <RelegationForm />
      </CardContent>
    </Card>
  );
}
