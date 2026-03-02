"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Marquee from "@/components/Dashboard/Marquee";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import OCSelectModal from "@/components/modals/OCSelectModal";
import Courses from "@/components/Dashboard/Courses";
import Platoons from "@/components/Dashboard/Platoons";
import InterviewsPending from "@/components/Dashboard/InterviewsPending";
import Appointments from "@/components/Dashboard/Appointments";
import { api } from "@/app/lib/apiClient";
import { resolveApiAction } from "@/app/lib/acx/action-map";
import { isAuthzV2Enabled } from "@/app/lib/acx/feature-flag";

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

function normalizeRole(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isPlatoonCommanderDashboardUser(me: MeDashboardResponse | null) {
  const scopeType = String(me?.apt?.scope?.type ?? "").trim().toUpperCase();
  if (scopeType !== "PLATOON") return false;

  const roleCandidates = [
    me?.apt?.position ?? null,
    ...(Array.isArray(me?.roles) ? me!.roles : []),
  ]
    .map((value) => normalizeRole(value))
    .filter(Boolean);

  return roleCandidates.some((role) => {
    const compactRole = role.replace(/[^A-Z0-9]/g, "");
    const isExplicitPlatoonCommander =
      (role.includes("PLATOON") && (role.includes("COMMANDER") || role.includes("CDR"))) ||
      role.includes("PLCDR") ||
      role.includes("PL_CDR") ||
      compactRole.includes("PLATOONCOMMANDER") ||
      compactRole.includes("PLCDR");

    return isExplicitPlatoonCommander;
  });
}

function buildPendingMarqueeData(items: InterviewPendingMarqueeRow[]): string[] {
  const pendingByPlatoon = new Map<string, { label: string; count: number }>();

  for (const item of items) {
    const label = item.platoon?.trim();
    if (!label) continue;
    const bucket = pendingByPlatoon.get(label) ?? { label, count: 0 };

    if (!item.completeInitial || !item.completeTerms) {
      bucket.count += 1;
    }

    pendingByPlatoon.set(label, bucket);
  }

  const platoonLines = Array.from(pendingByPlatoon.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((row) => (row.count > 0 ? `${row.label}: ${row.count} •` : `${row.label}: Completed •`));

  if (!platoonLines.length) {
    return ["*** Interviews Pending:", "No platoon data •", "***"];
  }

  return ["*** Interviews Pending:", ...platoonLines, "***"];
}

const interviewPendingApiAction = resolveApiAction("GET", "/api/v1/admin/interview/pending");

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
  if (isPlatoonCommanderDashboardUser(me)) return true;
  if (permissions.has("*")) return true;
  return permissions.has(mappedAction.action);
}

const DashboardPage = () => {
  const router = useRouter();
  const authzV2Enabled = isAuthzV2Enabled();

  // Modal controls
  const [open, setOpen] = useState(false);

  // Search controls
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [filteredOCs, setFilteredOCs] = useState<any[]>([]);
  const [marqueeItems, setMarqueeItems] = useState<string[]>(["*** Interviews Pending: Loading... ***"]);
  const [meInfo, setMeInfo] = useState<MeDashboardResponse | null>(null);
  const [meResolved, setMeResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      try {
        const res = await api.get<MeDashboardResponse>("/api/v1/me");
        if (!cancelled) setMeInfo(res);
      } catch (err) {
        // Non-fatal for dashboard rendering; default layout remains.
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

    const loadInterviewPendingMarquee = async () => {
      const pageSize = 1000;
      let offset = 0;
      let page = 0;
      const maxPages = 20;
      const allItems: InterviewPendingMarqueeRow[] = [];

      try {
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
          allItems.push(...batch);

          if (batch.length < pageSize) break;

          offset += pageSize;
          page += 1;
        }

        if (!cancelled) {
          setMarqueeItems(buildPendingMarqueeData(allItems));
        }
      } catch (err) {
        // Only show "Not Available" on API failure.
        console.error("Failed to load interview pending marquee data", err);
        if (!cancelled) {
          setMarqueeItems(["Not Available"]);
        }
      }
    };

    loadInterviewPendingMarquee();

    return () => {
      cancelled = true;
    };
  }, [authzV2Enabled, meInfo, meResolved]);

  const showPlCdrDashboardView = isPlatoonCommanderDashboardUser(meInfo);
  const canViewInterviewPendingData = canViewInterviewPending(meInfo, { authzV2Enabled, meResolved });
  const showInterviewsPendingTable = showPlCdrDashboardView && canViewInterviewPendingData === true;

  const handleCardClick = () => {
    setOpen(true);
  };

  return (
    <DashboardLayout title="MCEME CTW Dashboard" description="Training Management System">

      <main className="flex-1 p-6 w-full mt-2 overflow-x-hidden">

        {/* Marquee Section - Only visible in content area with proper clipping */}
        <div className="w-full overflow-hidden z-40 shrink-0">
          <Marquee
            data={marqueeItems}
            speed={15}
            className="w-full"
          />
        </div>

        {/* Cartesian Plane Layout - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          {/* Top Left Quadrant */}
          <div className="w-full">
            <div className="min-w-[400px]">
              <Courses />
            </div>
          </div>

          {/* Top Right Quadrant */}
          <div className="w-full">
            <div className="min-w-[400px]">
              {showInterviewsPendingTable ? <InterviewsPending /> : <Platoons />}
            </div>
          </div>

          {/* Bottom Spanning Both Columns */}
          <div className="w-full lg:col-span-2 mt-2">
            <Appointments />
          </div>
        </div>
      </main>

      {/* ===================== Modal ===================== */}
      <OCSelectModal
        open={open}
        onOpenChange={setOpen}
        onSelect={(oc) => router.push(`/dashboard/${oc.id}/milmgmt`)}
      />
    </DashboardLayout>
  );
};

export default DashboardPage;
