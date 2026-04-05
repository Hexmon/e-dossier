"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { bootstrapSuperAdmin } from "@/app/lib/api/setupApi";
import { getAllCourses } from "@/app/lib/api/courseApi";
import { loginUser } from "@/app/lib/api/authApi";
import { hierarchyAdminApi } from "@/app/lib/api/hierarchyAdminApi";
import { getPlatoons } from "@/app/lib/api/platoonApi";
import { listSubjects } from "@/app/lib/api/subjectsApi";
import type { SetupStatus, SetupStepKey, SetupStepStatus } from "@/app/lib/setup-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import type { SidebarRoleGroup } from "@/lib/sidebar-visibility";
import { resolveToneClasses } from "@/lib/theme-color";

type SetupPageClientProps = {
  initialStatus: SetupStatus;
  roleGroup: SidebarRoleGroup | null;
};

const STEP_LABELS: Record<SetupStepKey, string> = {
  superAdmin: "Super Admin",
  platoons: "Platoons",
  hierarchy: "Hierarchy",
  courses: "Courses",
  offerings: "Offerings / Semesters",
  ocs: "Officer Cadets",
};

function buildReturnToHref(path: string) {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.set("returnTo", "/setup");
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function StatusBadge({ status }: { status: SetupStepStatus }) {
  const label = status === "complete" ? "Complete" : status === "blocked" ? "Blocked" : "Pending";
  const classes =
    status === "complete"
      ? resolveToneClasses("success", "subtle")
      : status === "blocked"
        ? resolveToneClasses("muted", "subtle")
        : resolveToneClasses("warning", "subtle");

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function StepSummary({
  title,
  status,
  description,
  children,
}: {
  title: string;
  status: SetupStepStatus;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

export function SetupPageClient({ initialStatus, roleGroup }: SetupPageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: setupStatus, isLoading, refetch } = useSetupStatus(initialStatus);
  const [bootstrapForm, setBootstrapForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    rank: "",
  });
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success" | "info" | null;
    message: string;
  }>({
    tone: null,
    message: "",
  });

  const canManageSetup = roleGroup === "ADMIN" || roleGroup === "SUPER_ADMIN";

  const hierarchyQuery = useQuery({
    queryKey: ["setup-hierarchy-nodes"],
    queryFn: () => hierarchyAdminApi.listNodes(),
    enabled: canManageSetup,
  });
  const platoonsQuery = useQuery({
    queryKey: ["setup-platoons"],
    queryFn: getPlatoons,
    enabled: canManageSetup,
  });
  const coursesQuery = useQuery({
    queryKey: ["setup-courses"],
    queryFn: getAllCourses,
    enabled: canManageSetup,
  });
  const subjectsQuery = useQuery({
    queryKey: ["setup-subjects"],
    queryFn: () => listSubjects({ limit: 1 }),
    enabled: canManageSetup,
  });

  const hierarchyNodes = hierarchyQuery.data?.items ?? [];
  const platoons = platoonsQuery.data ?? [];
  const courses = coursesQuery.data?.items ?? [];
  const subjects = subjectsQuery.data?.subjects ?? [];

  const rootNode = hierarchyNodes.find((node) => node.nodeType === "ROOT") ?? null;
  const existingPlatoonNodeIds = new Set(
    hierarchyNodes
      .filter((node) => node.nodeType === "PLATOON" && node.platoonId)
      .map((node) => node.platoonId as string)
  );
  const missingPlatoonNodes = platoons.filter((platoon) => !existingPlatoonNodeIds.has(platoon.id));
  const firstCourseId = courses[0]?.id ?? null;
  const hasSubjects = subjects.length > 0;

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (bootstrapForm.password !== bootstrapForm.confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }

      return bootstrapSuperAdmin({
        username: bootstrapForm.username.trim(),
        email: bootstrapForm.email.trim(),
        password: bootstrapForm.password,
        name: bootstrapForm.name.trim() || undefined,
        phone: bootstrapForm.phone.trim() || undefined,
        rank: bootstrapForm.rank.trim() || undefined,
      });
    },
    onSuccess: async (result) => {
      await loginUser({
        appointmentId: result.appointmentId,
        username: bootstrapForm.username.trim().toLowerCase(),
        password: bootstrapForm.password,
      });

      setFeedback({
        tone: "success",
        message: "Initial super admin created. Signing in and continuing setup.",
      });
      toast.success("Initial super admin created. Signed in and continuing setup.");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["setup-status"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["navigation", "me"] }),
      ]);

      router.refresh();
    },
    onError: (error: unknown) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create the initial super admin.",
      });
      toast.error(error instanceof Error ? error.message : "Failed to create the initial super admin.");
      void refetch();
    },
  });

  const syncHierarchyMutation = useMutation({
    mutationFn: async () => {
      if (!rootNode) {
        throw new Error("ROOT hierarchy node is missing.");
      }

      if (missingPlatoonNodes.length === 0) {
        return 0;
      }

      const maxSortOrder = hierarchyNodes
        .filter((node) => node.parentId === rootNode.id)
        .reduce((current, node) => Math.max(current, Number(node.sortOrder ?? 0)), 0);

      for (const [index, platoon] of missingPlatoonNodes.entries()) {
        await hierarchyAdminApi.createNode({
          key: `SETUP_PLATOON_${platoon.key}_${platoon.id.slice(0, 8).toUpperCase()}`,
          name: platoon.name,
          nodeType: "PLATOON",
          parentId: rootNode.id,
          platoonId: platoon.id,
          sortOrder: maxSortOrder + index + 1,
        });
      }

      return missingPlatoonNodes.length;
    },
    onSuccess: async (createdCount) => {
      if (createdCount === 0) {
        setFeedback({
          tone: "info",
          message: "Hierarchy is already aligned with the active platoons.",
        });
        toast.success("Hierarchy is already aligned with the active platoons.");
      } else {
        setFeedback({
          tone: "success",
          message: `Created ${createdCount} missing platoon hierarchy node(s).`,
        });
        toast.success(`Created ${createdCount} missing platoon hierarchy node(s).`);
      }

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["setup-hierarchy-nodes"] }),
        queryClient.invalidateQueries({ queryKey: ["hierarchy-nodes"] }),
      ]);
    },
    onError: (error: unknown) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create missing platoon nodes.",
      });
      toast.error(error instanceof Error ? error.message : "Failed to create missing platoon nodes.");
    },
  });

  const pendingSteps = useMemo(() => {
    if (!setupStatus) {
      return [];
    }

    return (Object.entries(setupStatus.steps) as Array<[SetupStepKey, { status: SetupStepStatus }]>)
      .filter(([, step]) => step.status !== "complete")
      .map(([stepKey]) => STEP_LABELS[stepKey]);
  }, [setupStatus]);

  if (isLoading || !setupStatus) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Loading setup status...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (setupStatus.bootstrapRequired) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-12">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Initial Super Admin Setup</CardTitle>
              <CardDescription>
                Create the first SUPER_ADMIN account to unlock the guided organization setup flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                aria-live="polite"
                role={feedback.tone === "error" ? "alert" : "status"}
                className={
                  feedback.tone === "error"
                    ? "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                    : feedback.tone === "success"
                      ? "rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success-foreground"
                      : feedback.tone === "info"
                        ? "rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info-foreground"
                        : "sr-only"
                }
              >
                {feedback.message || "No setup feedback available."}
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  bootstrapMutation.mutate();
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setup-username">Username</Label>
                    <Input
                      id="setup-username"
                      value={bootstrapForm.username}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, username: event.target.value }))
                      }
                      placeholder="superadmin"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-email">Email</Label>
                    <Input
                      id="setup-email"
                      type="email"
                      value={bootstrapForm.email}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="superadmin@example.mil"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-password">Password</Label>
                    <Input
                      id="setup-password"
                      type="password"
                      value={bootstrapForm.password}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Strong password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-password-confirm">Confirm Password</Label>
                    <Input
                      id="setup-password-confirm"
                      type="password"
                      value={bootstrapForm.confirmPassword}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-name">Name</Label>
                    <Input
                      id="setup-name"
                      value={bootstrapForm.name}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Super Admin"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-rank">Rank</Label>
                    <Input
                      id="setup-rank"
                      value={bootstrapForm.rank}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, rank: event.target.value }))
                      }
                      placeholder="SUPER"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="setup-phone">Phone</Label>
                    <Input
                      id="setup-phone"
                      value={bootstrapForm.phone}
                      onChange={(event) =>
                        setBootstrapForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      placeholder="+0000000000"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <Button className="w-full" disabled={bootstrapMutation.isPending} type="submit">
                  {bootstrapMutation.isPending ? "Creating Super Admin..." : "Create Super Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next</CardTitle>
              <CardDescription>
                The setup flow signs the new SUPER_ADMIN in immediately, then guides the minimum foundation setup in this order.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-inside list-decimal space-y-3">
                <li>Create the initial super admin account.</li>
                <li>Add platoons.</li>
                <li>Link platoons into the live hierarchy tree.</li>
                <li>Create courses.</li>
                <li>Configure offerings and semester availability.</li>
                <li>Add initial OC records.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!canManageSetup) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Setup Requires Admin Access</CardTitle>
            <CardDescription>
              The initial bootstrap is complete. Sign in with an ADMIN or SUPER_ADMIN account to continue the guided setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Pending steps: {pendingSteps.length > 0 ? pendingSteps.join(", ") : "none"}.
            </div>
            <Button asChild>
              <Link href="/login?next=%2Fsetup">Sign in to Continue Setup</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Initial System Setup</h1>
        <p className="text-muted-foreground">
          Complete the minimum organization setup through the existing management modules. This flow only tracks progress and links you into the canonical editors.
        </p>
      </div>

      <div
        aria-live="polite"
        role={feedback.tone === "error" ? "alert" : "status"}
        className={
          feedback.tone === "error"
            ? "mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            : feedback.tone === "success"
              ? "mb-6 rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success-foreground"
              : feedback.tone === "info"
                ? "mb-6 rounded-md border border-info/30 bg-info/10 p-4 text-sm text-info-foreground"
                : "sr-only"
        }
      >
        {feedback.message || "No setup feedback available."}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {(Object.entries(setupStatus.steps) as Array<
          [SetupStepKey, { status: SetupStepStatus }]
        >).map(([stepKey, step]) => (
          <Card key={stepKey}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium text-foreground">{STEP_LABELS[stepKey]}</p>
              <StatusBadge status={step.status} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p>
          Counts: {setupStatus.counts.activePlatoons} platoon(s), {setupStatus.counts.activeCourses} course(s),{" "}
          {setupStatus.counts.activeOfferings} offering(s), {setupStatus.counts.activeOCs} OC record(s),{" "}
          {setupStatus.counts.activeHierarchyNodes} hierarchy node(s), and{" "}
          {setupStatus.counts.missingPlatoonHierarchyNodes} missing platoon hierarchy node(s).
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StepSummary
          title="Platoons"
          status={setupStatus.steps.platoons.status}
          description="Create at least one active platoon before linking it into the hierarchy."
        >
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={buildReturnToHref("/dashboard/genmgmt/platoon-management")}>
                Open Platoon Management
              </Link>
            </Button>
          </div>
        </StepSummary>

        <StepSummary
          title="Hierarchy"
          status={setupStatus.steps.hierarchy.status}
          description="ROOT already exists. Each active platoon must have one linked PLATOON node."
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Missing linked platoon nodes: {setupStatus.counts.missingPlatoonHierarchyNodes}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => syncHierarchyMutation.mutate()}
                disabled={
                  syncHierarchyMutation.isPending ||
                  !rootNode ||
                  missingPlatoonNodes.length === 0
                }
              >
                {syncHierarchyMutation.isPending
                  ? "Creating Missing Nodes..."
                  : "Create Missing Platoon Nodes"}
              </Button>
              <Button asChild variant="outline">
                <Link href={buildReturnToHref("/dashboard/genmgmt/hierarchy")}>
                  Open Hierarchy Manager
                </Link>
              </Button>
            </div>
          </div>
        </StepSummary>

        <StepSummary
          title="Courses"
          status={setupStatus.steps.courses.status}
          description="Create at least one active course for the initial intake."
        >
          <Button asChild>
            <Link href={buildReturnToHref("/dashboard/genmgmt/coursemgmt")}>Open Course Management</Link>
          </Button>
        </StepSummary>

        <StepSummary
          title="Offerings / Semesters"
          status={setupStatus.steps.offerings.status}
          description="Semester availability comes from course offerings. Create subjects first if none exist yet."
        >
          <div className="space-y-3">
            {!hasSubjects ? (
              <p className="text-sm text-muted-foreground">
                No active subjects are available yet. Add at least one subject before creating offerings.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {!hasSubjects ? (
                <Button asChild>
                  <Link href={buildReturnToHref("/dashboard/genmgmt/subjectmgmt")}>
                    Open Subject Management
                  </Link>
                </Button>
              ) : null}
              {firstCourseId ? (
                <Button asChild variant={hasSubjects ? "default" : "outline"}>
                  <Link href={buildReturnToHref(`/dashboard/genmgmt/coursemgmt/${firstCourseId}/offerings`)}>
                    Open Offering Management
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={buildReturnToHref("/dashboard/genmgmt/coursemgmt")}>
                    Create a Course First
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </StepSummary>

        <StepSummary
          title="Officer Cadets"
          status={setupStatus.steps.ocs.status}
          description="Create the initial OC records manually or through bulk upload."
        >
          <Button asChild>
            <Link href={buildReturnToHref("/dashboard/genmgmt/ocmgmt")}>Open OC Management</Link>
          </Button>
        </StepSummary>

        <StepSummary
          title="Recommended Follow-up"
          status="pending"
          description="Commander-equivalent mapping is not required to finish setup, but it should be reviewed before operational rollout."
        >
          <Button asChild variant="outline">
            <Link href={buildReturnToHref("/dashboard/genmgmt/hierarchy")}>
              Review Commander Mapping
            </Link>
          </Button>
        </StepSummary>
      </div>
    </main>
  );
}
