"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Marquee from "@/components/Dashboard/Marquee";
import OCSelectModal from "@/components/modals/OCSelectModal";
import Courses from "@/components/Dashboard/Courses";
import Platoons from "@/components/Dashboard/Platoons";
import InterviewsPending from "@/components/Dashboard/InterviewsPending";
import Appointments from "@/components/Dashboard/Appointments";
import WorkflowNotifications from "@/components/Dashboard/WorkflowNotifications";
import { api } from "@/app/lib/apiClient";
import { resolveApiAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";
import {
  buildInterviewPendingByDaysText,
  isPlatoonCommanderDashboardUser,
} from "@/lib/interview-pending-ticker";

type InterviewPendingMarqueeRow = {
  ocNo: string;
  rankAndName: string;
  course: string | null;
  platoon: string | null;
  completeInitial: boolean;
  completeTerms: boolean;
};

type InterviewPendingMarqueeResponse = {
  items: InterviewPendingMarqueeRow[];
  count: number;
};

type InterviewPendingTickerSettingResponse = {
  setting: {
    days: number;
  } | null;
};

type MeDashboardResponse = {
  message: string;
  roles?: string[];
  permissions?: string[];
  deniedPermissions?: string[];
  apt?: {
    position?: string | null;
    scope?: {
      type?: string | null;
      id?: string | null;
    } | null;
  } | null;
};

const interviewPendingApiAction = resolveApiAction("GET", "/api/v1/admin/interview/pending");

function buildPendingCountsMarqueeData(items: InterviewPendingMarqueeRow[]): string[] {
  const pendingByPlatoon = new Map<string, number>();

  for (const item of items) {
    const label = item.platoon?.trim();
    if (!label) continue;

    const prev = pendingByPlatoon.get(label) ?? 0;
    const next = !item.completeInitial || !item.completeTerms ? prev + 1 : prev;
    pendingByPlatoon.set(label, next);
  }

  const rows = Array.from(pendingByPlatoon.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `${label}: ${count} •`);

  return rows.length > 0 ? rows : ["No platoon data •"];
}

function canViewInterviewPending(
  me: MeDashboardResponse | null,
  options: { authzV2Enabled: boolean; meResolved: boolean },
): boolean | null {
  const { authzV2Enabled, meResolved } = options;
  if (!authzV2Enabled) return true;
  if (!meResolved) return null;

  const mappedAction = interviewPendingApiAction;
  if (!mappedAction) return true;

  const roles = (me?.roles ?? []).map((role) => String(role).trim().toUpperCase());
  const permissions = new Set<string>((me?.permissions ?? []).map((perm) => String(perm)));

  if (roles.includes("SUPER_ADMIN")) return true;
  if (roles.includes("ADMIN") && mappedAction.adminBaseline) return true;
  if (
    isPlatoonCommanderDashboardUser({
      roles: me?.roles ?? [],
      position: me?.apt?.position ?? null,
      scopeType: me?.apt?.scope?.type ?? null,
    })
  ) {
    return true;
  }
  if (permissions.has("*")) return true;
  return permissions.has(mappedAction.action);
}

const DashboardPage = () => {
  const router = useRouter();
  const authzV2Enabled = isAuthzV2Enabled();

  const [open, setOpen] = useState(false);
  const [marqueeItems, setMarqueeItems] = useState<string[]>([buildInterviewPendingByDaysText(0)]);
  const [meInfo, setMeInfo] = useState<MeDashboardResponse | null>(null);
  const [meResolved, setMeResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      try {
        const res = await api.get<MeDashboardResponse>("/api/v1/me");
        if (!cancelled) setMeInfo(res);
      } catch (err) {
        console.error("Failed to load current user context for dashboard", err);
      } finally {
        if (!cancelled) setMeResolved(true);
      }
    };

    loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authzV2Enabled && !meResolved) return;

    const access = canViewInterviewPending(meInfo, { authzV2Enabled, meResolved });
    if (access === false) {
      setMarqueeItems(["Access Restricted"]);
      return;
    }
    if (access !== true) return;

    let cancelled = false;

    const loadInterviewPendingTickerSetting = async () => {
      const pageSize = 1000;
      const maxPages = 20;
      let offset = 0;
      let page = 0;
      const allRows: InterviewPendingMarqueeRow[] = [];

      try {
        const tickerPromise = api.get<InterviewPendingTickerSettingResponse>(
          "/api/v1/admin/interview/pending/ticker-setting",
          {
            query: {
              includeLogs: false,
            },
          }
        );

        while (page < maxPages) {
          const res = await api.get<InterviewPendingMarqueeResponse>("/api/v1/admin/interview/pending", {
            query: {
              active: "true",
              limit: pageSize,
              offset,
              sort: "name_asc",
            },
          });

          const batch = Array.isArray(res.items) ? res.items : [];
          allRows.push(...batch);

          if (batch.length < pageSize) break;
          page += 1;
          offset += pageSize;
        }

        const tickerRes = await tickerPromise;
        if (!cancelled) {
          const days = Number.isFinite(tickerRes?.setting?.days) ? Number(tickerRes.setting?.days) : 0;
          const pendingCounts = buildPendingCountsMarqueeData(allRows);
          setMarqueeItems([buildInterviewPendingByDaysText(days), ...pendingCounts]);
        }
      } catch (err) {
        console.error("Failed to load interview pending ticker setting", err);
        if (!cancelled) {
          setMarqueeItems([buildInterviewPendingByDaysText(0), "Pending interviews data not available •"]);
        }
      }
    };

    loadInterviewPendingTickerSetting();

    return () => {
      cancelled = true;
    };
  }, [authzV2Enabled, meInfo, meResolved]);

  const showPlCdrDashboardView = isPlatoonCommanderDashboardUser({
    roles: meInfo?.roles ?? [],
    position: meInfo?.apt?.position ?? null,
    scopeType: meInfo?.apt?.scope?.type ?? null,
  });
  const canViewInterviewPendingData = canViewInterviewPending(meInfo, { authzV2Enabled, meResolved });
  const showInterviewsPendingTable = showPlCdrDashboardView && canViewInterviewPendingData === true;

  return (
    <DashboardLayout title="MCEME CTW Dashboard" description="Training Management System">
      <main className="flex-1 p-6 w-full mt-2 overflow-x-hidden">
        <div className="w-full overflow-hidden z-40 shrink-0">
          <Marquee
            data={marqueeItems}
            speed={15}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          <div className="w-full">
            <div className="min-w-[400px]">
              <Courses />
            </div>
          </div>

          <div className="w-full">
            <div className="min-w-[400px]">
              {showInterviewsPendingTable ? <InterviewsPending /> : <Platoons />}
            </div>
          </div>

          <div className="w-full lg:col-span-2 mt-2">
            <Appointments />
          </div>

          <WorkflowNotifications />
        </div>
      </main>

      <OCSelectModal
        open={open}
        onOpenChange={setOpen}
        onSelect={(oc) => router.push(`/dashboard/${oc.id}/milmgmt`)}
      />
    </DashboardLayout>
  );
};

export default DashboardPage;
