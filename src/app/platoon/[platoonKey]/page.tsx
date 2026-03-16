import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";

import { fetchPublicPlatoon, fetchPublicPlatoonCommanderHistory, fetchPublicSiteHeaderSettings } from "@/app/lib/public-platoons";
import Navbar from "@/components/Navbar";
import PublicCommanderHistory from "@/components/platoon/PublicCommanderHistory";
import SafeImage from "@/components/site-settings/SafeImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

type PlatoonPageProps = {
  params: Promise<{ platoonKey: string }>;
};

function formatAboutParagraphs(about: string | null): string[] {
  const text = (about ?? "").trim();
  if (!text) return ["No platoon description is available right now."];

  const lineParagraphs = text
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (lineParagraphs.length > 1) {
    return lineParagraphs;
  }

  const sentences =
    text
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (sentences.length <= 2) {
    return [text];
  }

  const groupedParagraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    groupedParagraphs.push(sentences.slice(index, index + 2).join(" "));
  }

  return groupedParagraphs;
}

export default async function PublicPlatoonPage({ params }: PlatoonPageProps) {
  const { platoonKey: rawPlatoonKey } = await params;
  const platoonKey = decodeURIComponent(rawPlatoonKey || "").trim();
  if (!platoonKey) notFound();

  const [siteHeader, platoon, history] = await Promise.all([
    fetchPublicSiteHeaderSettings(),
    fetchPublicPlatoon(platoonKey),
    fetchPublicPlatoonCommanderHistory(platoonKey),
  ]);
  const activeCommander = history?.items?.find((item) => item.status === "CURRENT") ?? null;

  if (!platoon) notFound();
  const aboutParagraphs = formatAboutParagraphs(platoon.about);

  return (
    <div className="min-h-screen bg-background">
      <Navbar logoUrl={siteHeader.logoUrl} siteTitle={siteHeader.siteTitle} />

      <main className="container mx-auto space-y-8 px-4 py-8">
        <Link href="/#platoons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to platoons
        </Link>

        <Card className="w-full overflow-hidden">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: normalizePlatoonThemeColor(platoon.themeColor ?? DEFAULT_PLATOON_THEME_COLOR) }}
          />
          <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3 pl-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold lg:text-3xl">{platoon.name}</h1>
              </div>
              <Badge variant="secondary">{platoon.key}</Badge>
              <div className="space-y-2 text-muted-foreground [overflow-wrap:anywhere]">
                {aboutParagraphs.map((paragraph, index) => (
                  <p
                    key={`${platoon.id}-about-${index}`}
                    className="whitespace-pre-line leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="-mr-[6px] space-y-2">
              <div className="mx-auto w-fit max-w-full overflow-hidden rounded-md border">
                <SafeImage
                  src={platoon.imageUrl}
                  alt={`${platoon.name} platoon`}
                  fallbackSrc="/images/commander-placeholder.jpg"
                  className="block h-[180px] w-auto max-w-full object-contain sm:h-[210px] md:h-[230px] lg:h-[250px]"
                />
              </div>
              <p className="text-center text-sm font-bold">
                {activeCommander ? `${activeCommander.rank} ${activeCommander.name}` : "Not Assigned"}
              </p>
            </div>
          </CardContent>
        </Card>

        <PublicCommanderHistory items={history?.items ?? []} />
      </main>

      <footer className="bg-primary py-8 text-primary-foreground">
        <section className="container mx-auto px-4 text-center">
          <p className="text-sm">
            For official MCEME internal use only. © 2025 Military College of Electronics & Mechanical Engineering
          </p>
        </section>
      </footer>
    </div>
  );
}
