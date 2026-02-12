"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  paths: BreadcrumbItem[];
}

export default function BreadcrumbNav({ paths }: BreadcrumbNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  const withTab = (href?: string) => {
    if (!href || !activeTab) return href;
    if (!href.includes("/dashboard/genmgmt") && !href.includes("/milmgmt")) {
      return href;
    }
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    if (!params.has("tab")) params.set("tab", activeTab);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  return (
    <div className="mb-6 flex items-center gap-2">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="h-8 w-8"
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </Button>

      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {paths.map((path, index) => {
            const isLast = index === paths.length - 1;
            const href = withTab(path.href);

            return (
              <li key={index} className="inline-flex items-center">
                {!isLast && href ? (
                  <Link
                    href={path.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {path.label}
                  </Link>
                ) : (
                  <span
                    className={`${
                      isLast ? "text-primary" : "text-muted-foreground"
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {path.label}
                  </span>
                )}
                {!isLast && (
                  <span className="px-1 text-muted-foreground">/</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
