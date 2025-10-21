"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";

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

import { getAppointments, Appointment } from "@/app/lib/api/appointmentApi";
import { loginUser } from "@/app/lib/api/authApi";

interface LoginForm {
  appointment: string;
  username: string;
  password: string;
  platoon?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOcCorner = searchParams.get("role") === "oc";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: {
      appointment: isOcCorner ? "OC" : "",
      username: "",
      password: "",
      platoon: "",
    },
  });

  const appointment = watch("appointment");
  const platoon = watch("platoon");

  // 🔹 Fetch all appointments on mount
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments();
        setAppointments(data);
      } catch (err) {
        console.error("Failed to fetch appointments", err);
        toast.error("Unable to load appointments.");
      } finally {
        setLoadingAppointments(false);
      }
    };
    fetchAppointments();
  }, []);

  // 🔹 Filter platoon commanders directly from appointments
  const platoonCommanders = appointments.filter(
    (a) => a.positionName === "Platoon Commander"
  );

  const onSubmit = async (data: LoginForm) => {
    if (!data.username || !data.password || !data.appointment) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const selectedAppointment = appointments.find(
        (a) => a.positionName === data.appointment
      );

      const selectedPlatoonCommander = platoonCommanders.find(
        (p) => p.username === data.platoon
      );

      const payload =
        data.appointment === "Platoon Commander"
          ? {
              appointmentId: selectedAppointment?.id as string,
              platoonId: selectedPlatoonCommander?.id as string,
              username: data.username,
              password: data.password,
            }
          : {
              appointmentId: selectedAppointment?.id as string,
              username: data.username,
              password: data.password,
            };

      await loginUser(payload);

      toast.success(`Welcome, ${data.appointment}!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
      console.error(err);
    }
  };

  const handleAppointmentChange = (value: string) => {
    setValue("appointment", value);
    setValue("username", "");
    if (value !== "Platoon Commander") setValue("platoon", "");
  };

  const handlePlatoonChange = (value: string) => {
    setValue("platoon", value);
    const selectedPlatoon = platoonCommanders.find((p) => p.username === value);
    const autoUsername = selectedPlatoon?.username || "";
    setValue("username", autoUsername);
  };

  return (
    <div className="min-h-screen bg-[var(--primary)] flex items-center justify-center p-4 relative">
      {/* Background */}
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
          alt="MCEME Background"
          className="object-contain"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img
            src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
            alt="MCEME Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-primary-foreground">
            MCEME CTW Portal
          </h1>
          <p className="text-primary-foreground/80">
            Sign in to access your account
          </p>
        </div>

        {isOcCorner ? (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg shadow-lg">
            <h2 className="text-4xl font-extrabold text-primary text-center">
              🚧 Coming Soon 🚧
            </h2>
          </div>
        ) : (
          <Card className="shadow-command">
            <CardHeader>
              <CardTitle className="text-center text-primary text-2xl">
                Sign in to MCEME CTW Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Appointment Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="appointment">Appointment</Label>
                  <Select
                    value={appointment}
                    onValueChange={handleAppointmentChange}
                    disabled={loadingAppointments}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingAppointments
                            ? "Loading..."
                            : "Select your appointment"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments.map((item) => (
                        <SelectItem key={item.id} value={item.positionName}>
                          {item.positionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Platoon Dropdown (derived from appointments) */}
                {appointment === "Platoon Commander" && (
                  <div className="space-y-2">
                    <Label htmlFor="platoon">Platoon</Label>
                    <Select
                      value={platoon}
                      onValueChange={handlePlatoonChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your platoon" />
                      </SelectTrigger>
                      <SelectContent>
                        {platoonCommanders.map((cmdr) => (
                          <SelectItem
                            key={cmdr.id}
                            value={cmdr.username}
                          >
                            {cmdr.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...register("username")}
                    placeholder="Enter username"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Enter password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[var(--primary)] text-white cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 border border-[var(--primary)]"
                  >
                    <Link href="/signup">Create New Account</Link>
                  </Button>
                  <Button asChild variant="ghost" className="flex-1">
                    <Link href="/reset-password">Forgot Password?</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button asChild variant="link" className="text-primary-foreground">
            <Link href="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
