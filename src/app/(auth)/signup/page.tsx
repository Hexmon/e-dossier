"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupUser, isStrongPassword, RESERVED_USERNAMES } from "@/app/lib/api/authApi";

// --- Constants ---
const PASSWORD_RULE = "Must be 8+ characters with uppercase, number, and special character";

type SignupFormValues = {
  email: string;
  phone: string;
  rank: string;
  name: string;
  note: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export default function Signup() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    defaultValues: {
      email: "",
      phone: "",
      rank: "",
      name: "",
      note: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const username = watch("username");

  const passwordStrong = isStrongPassword(password);
  const passwordMatch = password === confirmPassword;
  const usernameUnique =
    username.length >= 3 && !RESERVED_USERNAMES.includes(username.toLowerCase());

  const onSubmit = async (data: SignupFormValues) => {
    if (!passwordStrong) {
      toast.error("Password must include uppercase, number, and special character");
      return;
    }

    if (!passwordMatch) {
      toast.error("Passwords do not match");
      return;
    }

    if (!usernameUnique) {
      toast.error("Username is not available");
      return;
    }

    try {
      await signupUser(data);
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--primary)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
          alt="MCEME Background"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <img
            src="https://facultytick.com/wp-content/uploads/2022/03/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
            alt="MCEME Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-primary-foreground">Create Account</h1>
          <p className="text-primary-foreground/80">Join the MCEME CTW Portal</p>
        </div>

        <Card className="shadow-command">
          <CardHeader>
            <CardTitle className="text-center text-primary">New User Registration</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone + Rank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    {...register("phone", { required: "Phone number is required" })}
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Rank</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Captain, Major"
                    {...register("rank", { required: "Rank is required" })}
                  />
                  {errors.rank && <p className="text-red-500 text-sm">{errors.rank.message}</p>}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  {...register("name", { required: "Name is required" })}
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email" },
                  })}
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label>Unique Username</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Choose a unique username"
                    {...register("username", { required: "Username is required" })}
                  />
                  {username && (
                    <div className="absolute right-3 top-3">
                      {usernameUnique ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {errors.username && (
                  <p className="text-red-500 text-sm">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Create a strong password"
                    {...register("password", { required: "Password is required" })}
                  />
                  {password && (
                    <div className="absolute right-3 top-3">
                      {passwordStrong ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{PASSWORD_RULE}</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    {...register("confirmPassword", { required: "Please confirm password" })}
                  />
                  {confirmPassword && (
                    <div className="absolute right-3 top-3">
                      {passwordMatch ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>Note</Label>
                <Input
                  type="text"
                  placeholder="Add any remarks"
                  {...register("note", { required: "Note is required" })}
                />
                {errors.note && <p className="text-red-500 text-sm">{errors.note.message}</p>}
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full cursor-pointer" variant="default">
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button asChild variant="outline">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button asChild variant="link" className="text-primary-foreground">
            <Link href="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
