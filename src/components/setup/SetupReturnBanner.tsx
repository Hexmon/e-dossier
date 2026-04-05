"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SetupReturnBannerProps = {
  title: string;
  description: string;
};

export function SetupReturnBanner({ title, description }: SetupReturnBannerProps) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  if (returnTo !== "/setup") {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/setup">Return to Setup</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
