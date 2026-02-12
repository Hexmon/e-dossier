"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getAppointments, type Appointment } from "@/app/lib/api/appointmentApi";
import { loginUser, logout } from "@/app/lib/api/authApi";
import { ApiClientError } from "@/app/lib/apiClient";
import { fetchMe } from "@/app/lib/api/me";
import {
  clearReturnUrl,
  getCurrentDashboardPathWithQuery,
  readReturnUrl,
  resolvePostAuthRedirect,
  storeReturnUrl,
} from "@/lib/auth-return-url";
import {
  type CurrentIdentity,
  filterSwitchableAppointments,
  isSameIdentity,
  normalizeRoleKey,
} from "@/lib/switch-user";
import { type LoginForm } from "@/types/login";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SwitchUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIdentity: CurrentIdentity;
};

export default function SwitchUserModal({
  open,
  onOpenChange,
  currentIdentity,
}: SwitchUserModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsFetchError, setAppointmentsFetchError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasFetchedRef = useRef(false);

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: {
      appointment: "",
      username: "",
      password: "",
      platoon: "",
    },
  });

  const appointment = watch("appointment");
  const platoon = watch("platoon");
  const isBusy = isSubmitting || loadingAppointments;

  const switchableAppointments = useMemo(
    () => filterSwitchableAppointments(appointments, currentIdentity),
    [appointments, currentIdentity]
  );

  const uniqueAppointmentNames = useMemo(() => {
    const set = new Set<string>();
    switchableAppointments.forEach(({ positionName }) => {
      if (!set.has(positionName)) set.add(positionName);
    });
    return Array.from(set);
  }, [switchableAppointments]);

  const platoonCommanders = useMemo(
    () => switchableAppointments.filter((a) => a.scopeType === "PLATOON"),
    [switchableAppointments]
  );

  const hasAppointmentsData = useMemo(
    () =>
      !loadingAppointments &&
      !appointmentsFetchError &&
      switchableAppointments.length > 0,
    [appointmentsFetchError, loadingAppointments, switchableAppointments.length]
  );

  const shouldDisableOtherFields = useMemo(
    () => !hasAppointmentsData || !appointment,
    [appointment, hasAppointmentsData]
  );

  useEffect(() => {
    if (!open) return;
    if (hasFetchedRef.current && !appointmentsFetchError) return;

    setLoadingAppointments(true);

    getAppointments()
      .then((data) => {
        hasFetchedRef.current = true;
        setAppointments(data);
        setAppointmentsFetchError(false);
      })
      .catch(() => {
        hasFetchedRef.current = false;
        setAppointmentsFetchError(true);
        toast.error("Unable to load appointments. Please try again.");
      })
      .finally(() => {
        setLoadingAppointments(false);
      });
  }, [appointmentsFetchError, open]);

  useEffect(() => {
    if (open) return;
    reset({
      appointment: "",
      username: "",
      password: "",
      platoon: "",
    });
    setShowPassword(false);
  }, [open, reset]);

  const handleAppointmentChange = (value: string) => {
    setValue("appointment", value);
    if (value !== "Platoon Commander") {
      const selectedAppointment = switchableAppointments.find(
        (a) => a.positionName === value
      );
      setValue("username", selectedAppointment?.username ?? "");
      setValue("platoon", "");
      return;
    }

    setValue("username", "");
  };

  const handlePlatoonChange = (value: string) => {
    setValue("platoon", value);
    const selectedPlatoon = platoonCommanders.find(
      ({ platoonName }) => platoonName === value
    );
    setValue("username", selectedPlatoon?.username ?? "");
  };

  const onSubmit = async (formData: LoginForm) => {
    if (!formData.username || !formData.password || !formData.appointment) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const selectedAppointment = switchableAppointments.find(
      (a) => a.positionName === formData.appointment
    );
    if (!selectedAppointment?.id) {
      toast.error("Please select a valid appointment.");
      return;
    }

    const selectedPlatoonCommander = platoonCommanders.find(
      (p) => p.username === formData.platoon
    );

    if (formData.appointment === "Platoon Commander" && !selectedPlatoonCommander?.id) {
      toast.error("Please select a valid platoon.");
      return;
    }

    const targetIdentity: CurrentIdentity = {
      userId: selectedAppointment.userId ?? null,
      appointmentId: selectedAppointment.id,
      roleKey: selectedAppointment.positionKey,
      username: selectedAppointment.username ?? formData.username,
    };

    if (
      isSameIdentity(currentIdentity, targetIdentity) ||
      normalizeRoleKey(currentIdentity.roleKey) === normalizeRoleKey(targetIdentity.roleKey)
    ) {
      toast.error("Already logged in as this role/account.");
      return;
    }

    const payload =
      formData.appointment === "Platoon Commander"
        ? {
            appointmentId: selectedAppointment.id,
            platoonId: selectedPlatoonCommander!.id,
            username: formData.username,
            password: formData.password,
          }
        : {
            appointmentId: selectedAppointment.id,
            username: formData.username,
            password: formData.password,
          };

    const returnUrl = getCurrentDashboardPathWithQuery();
    if (returnUrl) {
      storeReturnUrl(returnUrl);
    }

    queryClient.clear();
    await logout().catch(() => {});

    try {
      await loginUser(payload);

      const nextMe = await fetchMe();
      const nextIdentity: CurrentIdentity = {
        userId: nextMe.user?.id ?? null,
        appointmentId: nextMe.apt?.id ?? null,
        roleKey: nextMe.apt?.position ?? null,
        username: nextMe.user?.username ?? null,
      };

      if (isSameIdentity(currentIdentity, nextIdentity)) {
        clearReturnUrl();
        onOpenChange(false);
        toast.info("Already logged in as this account.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["navigation", "me"] });

      const redirectTo = resolvePostAuthRedirect({
        storedReturnUrl: readReturnUrl(),
        fallback: "/dashboard",
      });
      clearReturnUrl();
      onOpenChange(false);
      router.push(redirectTo);
      router.refresh();
      toast.success("User switched successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const status = err.status;
        const message = err.message;
        if (status === 401) {
          toast.error("Invalid credentials. Please try again.");
          return;
        }
        toast.error(message || "Failed to switch user.");
        return;
      }

      toast.error(err instanceof Error ? err.message : "Failed to switch user.");
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isBusy) {
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (isBusy) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Switch User</DialogTitle>
          <DialogDescription>
            Sign in as another user. Your current session will be replaced.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="switch-appointment">Appointment</Label>
            <Select
              value={appointment}
              onValueChange={handleAppointmentChange}
              disabled={
                isSubmitting ||
                loadingAppointments ||
                appointmentsFetchError ||
                switchableAppointments.length === 0
              }
            >
              <SelectTrigger id="switch-appointment">
                <SelectValue
                  placeholder={
                    loadingAppointments
                      ? "Loading..."
                      : appointmentsFetchError
                        ? "Failed to load appointments"
                        : switchableAppointments.length === 0
                          ? "No switchable accounts available"
                          : "Select your appointment"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {uniqueAppointmentNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(appointment ?? "") === "Platoon Commander" && (
            <div className="space-y-2">
              <Label htmlFor="switch-platoon">Platoon</Label>
              <Select
                value={platoon}
                onValueChange={handlePlatoonChange}
                disabled={isSubmitting || shouldDisableOtherFields}
              >
                <SelectTrigger id="switch-platoon">
                  <SelectValue placeholder="Select your platoon" />
                </SelectTrigger>
                <SelectContent>
                  {platoonCommanders.map(({ id, platoonName }) => (
                    <SelectItem key={id} value={platoonName ?? ""}>
                      {platoonName ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="switch-username">Username</Label>
            <Input
              id="switch-username"
              {...register("username")}
              placeholder="Enter username"
              required
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="switch-password">Password</Label>
            <div className="relative">
              <Input
                id="switch-password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Enter password"
                required
                disabled={isSubmitting || shouldDisableOtherFields}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || shouldDisableOtherFields}>
              {isSubmitting ? "Switching..." : "Switch User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
