"use client";

import { use, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SelectedCadetTable from "@/components/cadet_table/SelectedCadetTable";

import { militaryTrainingCards, miltrgTabs } from "@/config/app.config";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";

import { useOcDetails } from "@/hooks/useOcDetails";
import Marquee from "@/components/Dashboard/Marquee";
import { marqueeData2 } from "@/components/Dashboard/MarqueeData";
import { Input } from "@/components/ui/input";
import { resolveToneClasses } from "@/lib/theme-color";

const BASIC_CARD_COUNT = 7;
const ACADEMICS_CARD_TITLE = "Academics";

export default function MilitaryTrainingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ocId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const { cadet, loading, error } = useOcDetails(ocId);
  const tabParam = searchParams.get("tab");
  const validTabs = miltrgTabs.map((tab) => tab.value);
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : "basic-details";
  const activeTabLabel =
    miltrgTabs.find((tab) => tab.value === activeTab)?.title ?? "Basic Details";
  const [basicSearch, setBasicSearch] = useState("");
  const [miltrgSearch, setMiltrgSearch] = useState("");

  const updateTab = (value: string) => {
    if (value === activeTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const withTab = (href: string, tab: string) => {
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("tab", tab);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const filterCards = (
    cards: typeof militaryTrainingCards,
    query: string
  ) => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => {
      const title = card.title.toLowerCase();
      const description = card.description.toLowerCase();
      return title.includes(q) || description.includes(q);
    });
  };

  const basicCards = useMemo(
    () => filterCards(militaryTrainingCards.slice(0, BASIC_CARD_COUNT), basicSearch),
    [basicSearch]
  );

  const academicsCards = militaryTrainingCards.filter(
    (item) => item.title === ACADEMICS_CARD_TITLE
  );

  const miltrgCards = useMemo(
    () =>
      filterCards(
        militaryTrainingCards
          .slice(BASIC_CARD_COUNT)
          .filter((card) => card.title !== ACADEMICS_CARD_TITLE),
        miltrgSearch
      ),
    [miltrgSearch]
  );

  return (
    <DashboardLayout
      title="Dossier"
      description="Organize, manage, and securely store essential documents"
    >
      {/* Breadcrumb */}
      <div className="flex justify-between items-center rounded-2xl mb-4">
        <BreadcrumbNav
          paths={[
            { label: "Dashboard", href: "/dashboard" },
            { label: activeTabLabel },
          ]}
        />
      </div>

      <div className="w-full overflow-hidden z-40 shrink-0">
          <Marquee
            data={marqueeData2}
            speed={25}
            className="w-full"
          />
        </div>

      {/* Cadet Info */}
      {loading && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          Loading cadet details...
        </p>
      )}

      {error && (
        <p className="text-center text-sm text-destructive mb-4">{error}</p>
      )}

      {cadet && (
        <div className="hidden md:flex sticky top-16 z-40 mb-6">
          <SelectedCadetTable selectedCadet={cadet} />
        </div>
      )}

      {/* Tabs */}
      <GlobalTabs
        tabs={miltrgTabs}
        defaultValue="basic-details"
        value={activeTab}
        onValueChange={updateTab}
      >
        <TabsContent value="basic-details" className="space-y-6">
          <div className="flex items-center justify-end">
            <div className="relative w-64">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                <Search className="h-4 w-4 text-primary" />
              </span>
              <Input
                placeholder="Search modules..."
                value={basicSearch}
                onChange={(e) => setBasicSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
            {basicCards.map((card, index) => {
              const Icon = card.icon;
              const url = typeof card.to === "function" ? card.to(ocId) : card.to;
              const tabbedUrl = withTab(url, "basic-details");
              return (
                <Card
                  key={index}
                  className="group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${resolveToneClasses(card.color, "icon")}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <CardTitle className="text-lg group-hover:text-primary">
                        {card.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {card.description}
                    </p>

                    <a href={tabbedUrl}>
                      <Button type="button" variant="default" className="w-full cursor-pointer">
                        Access Module {"->"}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {basicCards.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No modules found.</p>
          )}
        </TabsContent>

        <TabsContent value="mil-trg" className="space-y-6">
          <div className="flex items-center justify-end">
            <div className="relative w-64">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 p-1">
                <Search className="h-4 w-4 text-primary" />
              </span>
              <Input
                placeholder="Search modules..."
                value={miltrgSearch}
                onChange={(e) => setMiltrgSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
            {miltrgCards.map((card, index) => {
              const Icon = card.icon;
              const url = typeof card.to === "function" ? card.to(ocId) : card.to;
              const tabbedUrl = withTab(url, "mil-trg");
              return (
                <Card
                  key={index}
                  className="group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${resolveToneClasses(card.color, "icon")}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <CardTitle className="text-lg group-hover:text-primary">
                        {card.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {card.description}
                    </p>

                    <a href={tabbedUrl}>
                      <Button type="button" variant="default" className="w-full cursor-pointer">
                        Access Module {"->"}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {miltrgCards.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No modules found.</p>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-11 gap-y-6 mx-auto">
            {academicsCards.map((card, index) => {
              const Icon = card.icon;
              const url = typeof card.to === "function" ? card.to(ocId) : card.to;
              const tabbedUrl = withTab(url, "settings");
              return (
                <Card
                  key={index}
                  className="group hover:shadow-command transition-all duration-300 cursor-pointer rounded-xl shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${resolveToneClasses(card.color, "icon")}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <CardTitle className="text-lg group-hover:text-primary">
                        {card.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {card.description}
                    </p>

                    <a href={tabbedUrl}>
                      <Button type="button" variant="default" className="w-full cursor-pointer">
                        Access Module {"->"}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </GlobalTabs>
    </DashboardLayout>
  );
}
