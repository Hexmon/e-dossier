"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getSwitchableIdentities,
  type SwitchableIdentityResponseItem,
} from "@/app/lib/api/switchableIdentityApi";
import { loginUser } from "@/app/lib/api/authApi";
import { ApiClientError } from "@/app/lib/apiClient";
import { fetchMe } from "@/app/lib/api/me";
import { clearReturnUrl } from "@/lib/auth-return-url";
import { beginSwitchSession, endSwitchSession } from "@/lib/auth/switch-session";
import {
  type CurrentIdentity,
  filterSwitchableAppointments,
  isSameIdentity,
} from "@/lib/switch-user";
import { type LoginForm } from "@/types/login";
import { appLogoutReset, persistor, store } from "@/store";
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

  const [appointments, setAppointments] = useState<SwitchableIdentityResponseItem[]>([]);
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
  const isBusy = isSubmitting || loadingAppointments;

  const switchableAppointments = useMemo(
    () => filterSwitchableAppointments(appointments, currentIdentity),
    [appointments, currentIdentity]
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

  const resetClientSessionState = async () => {
    await queryClient.cancelQueries().catch(() => undefined);
    queryClient.clear();

    store.dispatch(appLogoutReset());
    persistor.pause();
    await persistor.flush().catch(() => undefined);
    await persistor.purge().catch(() => undefined);
    persistor.persist();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
    }
    clearReturnUrl();
  };

  const redirectToDashboard = () => {
    onOpenChange(false);
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    if (hasFetchedRef.current && !appointmentsFetchError) return;

    setLoadingAppointments(true);

    getSwitchableIdentities()
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
    const selectedAppointment = switchableAppointments.find((a) => a.id === value);

    setValue("appointment", value);
    setValue("username", selectedAppointment?.username ?? "");
    setValue(
      "platoon",
      selectedAppointment?.scopeType === "PLATOON"
        ? selectedAppointment.scopeId ?? ""
        : ""
    );
  };

  const onSubmit = async (formData: LoginForm) => {
    if (!formData.username || !formData.password || !formData.appointment) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const selectedAppointment = switchableAppointments.find((a) => a.id === formData.appointment);
    if (!selectedAppointment?.id) {
      toast.error("Please select a valid appointment.");
      return;
    }

    const loginUsername = selectedAppointment.username ?? formData.username;
    if (!loginUsername) {
      toast.error("Selected appointment has no username.");
      return;
    }

    const targetIdentity: CurrentIdentity = {
      userId: selectedAppointment.userId ?? null,
      appointmentId: selectedAppointment.appointmentId ?? null,
      delegationId: selectedAppointment.delegationId ?? null,
      roleKey: selectedAppointment.positionKey,
      username: loginUsername,
    };

    if (isSameIdentity(currentIdentity, targetIdentity)) {
      toast.error("Already logged in as this role/account.");
      return;
    }

    const isPlatoonScopedIdentity = selectedAppointment.scopeType === "PLATOON";
    const platoonId = isPlatoonScopedIdentity ? selectedAppointment.scopeId ?? null : null;
    if (isPlatoonScopedIdentity && !platoonId) {
      toast.error("Selected platoon-scoped identity has no platoon scope.");
      return;
    }

    const payload = {
      ...(selectedAppointment.kind === "DELEGATION"
        ? { delegationId: selectedAppointment.delegationId ?? selectedAppointment.id }
        : { appointmentId: selectedAppointment.appointmentId ?? selectedAppointment.id }),
      ...(platoonId ? { platoonId } : {}),
      username: loginUsername,
      password: formData.password,
    };

    beginSwitchSession();
    let loginSucceeded = false;

    try {
      await loginUser(payload);
      loginSucceeded = true;

      const nextMe = await fetchMe();
      const nextIdentity: CurrentIdentity = {
        userId: nextMe.user?.id ?? null,
        appointmentId: nextMe.apt?.id ?? null,
        delegationId: nextMe.authority?.delegationId ?? nextMe.apt?.delegation_id ?? null,
        roleKey: nextMe.apt?.position ?? null,
        username: nextMe.user?.username ?? null,
      };

      if (isSameIdentity(currentIdentity, nextIdentity)) {
        clearReturnUrl();
        onOpenChange(false);
        toast.info("Already logged in as this account.");
        return;
      }

      await resetClientSessionState();
      redirectToDashboard();
    } catch (err: unknown) {
      if (loginSucceeded) {
        await resetClientSessionState();
        redirectToDashboard();
        return;
      }

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
    } finally {
      endSwitchSession();
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
          <DialogTitle>Switch Account</DialogTitle>
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
                {switchableAppointments.map((apt) => (
                  <SelectItem key={apt.id} value={apt.id}>
                    {`${apt.positionName ?? apt.positionKey ?? "Appointment"}${
                      apt.platoonName ? ` - ${apt.platoonName}` : ""
                    } (${apt.username ?? "unknown"})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              {isSubmitting ? "Switching..." : "Switch Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
