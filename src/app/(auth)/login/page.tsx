"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointments, platoonsdata } from "@/config/app.config";
import Link from "next/link";
import { api, ApiClientError } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isOcCorner = searchParams.get("role") === "oc";

  const appointmentIds: Record<string, string> = {
    Commander: "uuid-for-commander",
    "Deputy Commander": "uuid-for-deputy-commander",
    "DS Coord": "uuid-for-ds-coord",
    HoAT: "uuid-for-hoat",
    CCO: "uuid-for-cco",
    "Platoon Commander": "uuid-for-platoon-commander",
  };

  const appointmentUsernames: Record<string, string> = {
    Commander: "commander_user",
    "Deputy Commander": "deputy_commander_user",
    "DS Coord": "ds_coord_user",
    HoAT: "hoat_user",
    CCO: "cco_user",
    "Platoon Commander": ""
  };

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    appointment: isOcCorner ? "OC" : "",
    platoon: ""
  });

  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);

  const handleAppointmentChange = (value: string) => {
    const autoUsername =
      value === "Platoon Commander" ? "" : appointmentUsernames[value] || "";

    setFormData((prev) => ({
      ...prev,
      appointment: value,
      username: isUsernameManuallyEdited ? prev.username : autoUsername,
      platoon: value === "Platoon Commander" ? prev.platoon : ""
    }));

    if (value !== "Platoon Commander") {
      setIsUsernameManuallyEdited(false);
    }
  };

  const handlePlatoonChange = (value: string) => {
    const selectedPlatoon = platoonsdata.find((p) => p.name === value);
    const autoUsername = selectedPlatoon?.username || "";

    setFormData((prev) => ({
      ...prev,
      platoon: value,
      username: isUsernameManuallyEdited ? prev.username : autoUsername
    }));

    setIsUsernameManuallyEdited(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.appointment) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Find matching appointment and platoon IDs
      const appointmentId = appointmentIds[formData.appointment];
      const selectedPlatoon = platoonsdata.find(
        (p) => p.name === formData.platoon
      );

      // Build request body dynamically
      const requestBody =
        formData.appointment === "Platoon Commander"
          ? {
            appointmentId,
            platoonId: selectedPlatoon?.id,
            username: formData.username,
            password: formData.password,
          }
          : {
            appointmentId,
            username: formData.username,
            password: formData.password,
          };

      // POST to login API
      const response = await api.post<{ token?: string; message?: string }>(
        endpoints.auth.login,
        requestBody,
        { baseURL }
      );

      toast.success(`Welcome, ${formData.appointment}!`);

      // Optional: store token if provided
      // localStorage.setItem("token", response.token || "");

      // Give the toast a short moment to appear before redirecting
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Invalid credentials");
        console.error("Login error:", err);
      } else {
        toast.error("Something went wrong. Please try again later.");
        console.error(err);
      }
    }
  };


  return (
    <div className="min-h-screen bg-[var(--primary)] flex items-center justify-center p-4 relative">
      {/* Background Logo */}
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
          alt="MCEME Background"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
            alt="MCEME Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-primary-foreground">MCEME CTW Portal</h1>
          <p className="text-primary-foreground/80">Sign in to access your account</p>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Appointment */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="appointment">Appointment</Label>
                  <Select
                    value={formData.appointment}
                    onValueChange={handleAppointmentChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments.map((appointment) => (
                        <SelectItem key={appointment} value={appointment}>
                          {appointment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Platoon dropdown */}
                {formData.appointment === "Platoon Commander" && (
                  <div className="space-y-2">
                    <Label htmlFor="platoon">Platoon</Label>
                    <Select
                      value={formData.platoon}
                      onValueChange={handlePlatoonChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your platoon" />
                      </SelectTrigger>
                      <SelectContent>
                        {platoonsdata.map((platoon) => (
                          <SelectItem key={platoon.name} value={platoon.name}>
                            {platoon.name}
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
                    type="text"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value });
                      setIsUsernameManuallyEdited(true);
                    }}
                    placeholder="Username auto-filled"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-[var(--primary)] text-white cursor-pointer" variant="default">
                  Sign In
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild variant="outline" className="flex-1 border border-[var(--primary)]">
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
