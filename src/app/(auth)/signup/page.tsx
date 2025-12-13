"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupUser, isStrongPassword, RESERVED_USERNAMES, checkUsernameAvailability } from "@/app/lib/api/authApi";
import { PASSWORD_RULE, SignupFormValues } from "../../../types/signup";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  const [password, confirmPassword, username] = watch(["password", "confirmPassword", "username"]);
  const [isChecking, setIsChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }

    // if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    //   setUsernameAvailable(false);
    //   setUsernameSuggestions([]);
    //   return;
    // }

    const delayDebounce = setTimeout(async () => {
      try {
        setIsChecking(true);
        const result = await checkUsernameAvailability(username);
        setUsernameAvailable(result.available);
        setUsernameSuggestions(result.suggestions || []);
      } catch (error) {
        setUsernameAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username]);

  const passwordStrong = isStrongPassword(password);
  const passwordMatch = password === confirmPassword;

  const onSubmit = async (data: SignupFormValues) => {
    if (!passwordStrong) {
      toast.error("Password must include uppercase, number, and special character");
      return;
    }

    if (!passwordMatch) {
      toast.error("Passwords do not match");
      return;
    }

    if (!usernameAvailable) {
      toast.error("Username is already taken");
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
    <main className="min-h-screen bg-[var(--primary)] flex items-center justify-center p-4 relative overflow-hidden">
      <figure className="absolute inset-0 opacity-5">
        <Image
          src="/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg"
          alt="MCEME Background"
          width={122}
          height={122}
          className="w-full h-full object-contain"
        />
      </figure>

      <article className="w-full max-w-lg relative z-10">
        <header className="text-center mb-8">
          <Image
            src="/images/eme_logo.jpeg"
            alt="MCEME Background"
            width={122}
            height={122}
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-primary-foreground">Create Account</h1>
          <p className="text-primary-foreground/80">Join the MCEME CTW Portal</p>
        </header>

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

                  {/* Right-side feedback icons */}
                  {username && (
                    <div className="absolute right-3 top-3">
                      {isChecking ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      ) : usernameAvailable ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : usernameAvailable === false ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Suggestions */}
                {usernameAvailable === false && usernameSuggestions.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Try:{" "}
                    {usernameSuggestions.map((s, i) => (
                      <span key={s} className="text-blue-500 cursor-pointer">
                        {s}
                        {i < usernameSuggestions.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                )}
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

        <nav className="text-center mt-6">
          <Button asChild variant="link" className="text-primary-foreground">
            <Link href="/">← Back to Home</Link>
          </Button>
        </nav>
      </article>
    </main>
  );
}
