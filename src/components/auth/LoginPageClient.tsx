"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  getLoginAppointments,
  type LoginAppointmentOption,
} from "@/app/lib/api/appointmentApi";
import { loginUser } from "@/app/lib/api/authApi";
import { ApiClientError } from "@/app/lib/apiClient";
import {
  clearReturnUrl,
  readReturnUrl,
  resolvePostAuthRedirect,
} from "@/lib/auth-return-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoginForm } from "@/types/login";

type LoginPageClientProps = {
  bootstrapRequired: boolean;
};

export default function LoginPageClient({
  bootstrapRequired,
}: LoginPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOcCorner = searchParams.get("role") === "oc";

  const [appointments, setAppointments] = useState<LoginAppointmentOption[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsFetchError, setAppointmentsFetchError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasFetchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const fetchAppointments = async () => {
    try {
      const data = await getLoginAppointments();
      setAppointments(data);
      setAppointmentsFetchError(false);
    } catch {
      toast.error("Unable to load appointments. Please try again.");
      setAppointmentsFetchError(true);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    void fetchAppointments();
  }, []);

  const selectedAppointment = useMemo(
    () => appointments.find((candidate) => candidate.id === appointment) ?? null,
    [appointment, appointments]
  );

  useEffect(() => {
    setValue("username", selectedAppointment?.username ?? "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [selectedAppointment, setValue]);

  const hasAppointmentsData = useMemo(
    () => !loadingAppointments && !appointmentsFetchError && appointments.length > 0,
    [loadingAppointments, appointmentsFetchError, appointments]
  );

  const shouldDisableOtherFields = useMemo(
    () => !hasAppointmentsData || !appointment,
    [hasAppointmentsData, appointment]
  );

  const appointmentHelpId = "login-appointment-help";
  const appointmentErrorId = "login-appointment-error";
  const appointmentDescribedBy = appointmentsFetchError
    ? `${appointmentHelpId} ${appointmentErrorId}`
    : appointmentHelpId;
  const usernameHelpId = "login-username-help";
  const passwordHelpId = "login-password-help";

  const onSubmit = async (data: LoginForm) => {
    if (!data.password || !data.appointment) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (!selectedAppointment) {
        toast.error("Please select a valid appointment.");
        return;
      }

      if (selectedAppointment.scopeType === "PLATOON" && !selectedAppointment.scopeId) {
        toast.error("Selected platoon mapping is invalid. Please reselect.");
        return;
      }

      const payload =
        selectedAppointment.scopeType === "PLATOON"
          ? {
              appointmentId: selectedAppointment.id,
              platoonId: selectedAppointment.scopeId as string,
              username: selectedAppointment.username,
              password: data.password,
            }
          : {
              appointmentId: selectedAppointment.id,
              username: selectedAppointment.username,
              password: data.password,
            };

      await loginUser(payload);

      toast.success(`Welcome, ${selectedAppointment.positionName || "appointment"}!`);
      const redirectTo = resolvePostAuthRedirect({
        nextParam: searchParams.get("next"),
        storedReturnUrl: readReturnUrl(),
        fallback: "/dashboard",
      });
      clearReturnUrl();
      router.push(redirectTo);
    } catch (err: unknown) {
      console.error("Login error:", err);

      if (err instanceof ApiClientError) {
        const errorData = (err as any).data ?? (err as any).response;
        const errorType = errorData?.error;
        const errorMessage = errorData?.message ?? err.message;

        if (err.status === 401) {
          if (errorType === "BAD_PASSWORD" || errorMessage === "invalid_credentials") {
            toast.error("Invalid credentials. Please check your password and try again.");
          } else if (errorType === "invalid_token" || errorMessage === "Unauthorized") {
            toast.error("Session expired. Please login again.");
          } else {
            toast.error("Invalid password !!");
          }
        } else {
          toast.error(err.message || "Login failed. Please try again.");
        }
        return;
      }

      toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  const handleAppointmentChange = (value: string) => {
    setValue("appointment", value);
  };

  const describeAppointment = (candidate: LoginAppointmentOption) => {
    const positionLabel = candidate.positionName || candidate.positionKey || "Appointment";
    if (candidate.scopeType === "PLATOON") {
      return candidate.platoonName
        ? `${positionLabel} (${candidate.platoonName})`
        : `${positionLabel} (Platoon scope)`;
    }
    return positionLabel;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--primary)] p-4">
      <div className="absolute inset-0 opacity-5">
        <Image
          src="/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
          alt="MCEME Background"
          width={122}
          height={122}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/images/eme_logo.jpeg"
            alt="MCEME Background"
            width={100}
            height={100}
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold text-primary-foreground">
            MCEME CTW Portal
          </h1>
          <p className="text-primary-foreground/80">
            Sign in to access your account
          </p>
        </div>

        {isOcCorner ? (
          <div className="flex h-64 items-center justify-center rounded-lg bg-muted shadow-lg">
            <h2 className="text-center text-4xl font-extrabold text-primary">
              🚧 Coming Soon 🚧
            </h2>
          </div>
        ) : (
          <div className="space-y-4">
            {bootstrapRequired ? (
              <Card className="border-warning/30 bg-warning/20 shadow-command">
                <CardHeader>
                  <CardTitle className="text-center text-xl text-warning-foreground">
                    Initial setup required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-warning-foreground/80">
                    This installation does not have an active SUPER_ADMIN yet. Complete the first-run setup before using the sign-in flow.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/setup">Open First-Run Setup</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="shadow-command">
              <CardHeader>
                <CardTitle className="text-center text-2xl text-primary">
                  Sign in to MCEME CTW Portal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-trigger">Appointment</Label>
                    <Select
                      value={appointment}
                      onValueChange={handleAppointmentChange}
                      disabled={
                        loadingAppointments ||
                        appointmentsFetchError ||
                        appointments.length === 0
                      }
                    >
                      <SelectTrigger
                        id="appointment-trigger"
                        className="w-full"
                        aria-describedby={appointmentDescribedBy}
                      >
                        <SelectValue
                          placeholder={
                            loadingAppointments
                              ? "Loading..."
                              : appointmentsFetchError
                                ? "Failed to load appointments"
                                : appointments.length === 0
                                  ? "No appointments available"
                                  : "Select your appointment"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {describeAppointment(candidate)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id={appointmentHelpId} className="text-sm text-muted-foreground">
                      Choose the appointment you are signing in for.
                    </p>
                    {appointmentsFetchError ? (
                      <p id={appointmentErrorId} className="text-sm text-destructive">
                        Unable to load appointments. Please refresh the page.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      {...register("username")}
                      placeholder={
                        selectedAppointment?.username ?? "Select an appointment first"
                      }
                      required
                      disabled={!appointment}
                      readOnly={Boolean(selectedAppointment)}
                      autoComplete="username"
                      aria-describedby={usernameHelpId}
                      aria-readonly={selectedAppointment ? "true" : undefined}
                      className={
                        selectedAppointment
                          ? "cursor-not-allowed bg-muted text-muted-foreground"
                          : undefined
                      }
                    />
                    <p id={usernameHelpId} className="text-sm text-muted-foreground">
                      Username is auto-filled from the selected appointment.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        placeholder="Enter password"
                        required
                        disabled={shouldDisableOtherFields}
                        autoComplete="current-password"
                        aria-describedby={passwordHelpId}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        aria-controls="password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p id={passwordHelpId} className="text-sm text-muted-foreground">
                      Enter the password for the selected appointment account.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full cursor-pointer bg-[var(--primary)] text-primary-foreground"
                    disabled={isSubmitting || shouldDisableOtherFields}
                  >
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 border border-[var(--primary)]"
                    >
                      <Link href="/signup">Create New Account</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 text-center">
          <Button asChild variant="link" className="text-primary-foreground">
            <Link href="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
