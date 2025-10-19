"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";
import { email } from "zod";

export default function Signup() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        rank: "",
        name: "",
        note: "",
        username: "",
        password: "",
        confirmPassword: ""
    });

    const [validations, setValidations] = useState({
        passwordStrength: false,
        passwordMatch: false,
        usernameUnique: false
    });

    // const appointments = [
    //     "Commander",
    //     "Deputy Commander",
    //     "DS Coord",
    //     "HoAT",
    //     "CCO",
    //     "Platoon Commander",
    //     "OC"
    // ];

    const checkPasswordStrength = (password: string) => {
        const hasLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        return hasLength && hasNumber && hasSpecial && hasUpper;
    };

    const handlePasswordChange = (password: string) => {
        setFormData({ ...formData, password });
        setValidations({
            ...validations,
            passwordStrength: checkPasswordStrength(password),
            passwordMatch: password === formData.confirmPassword
        });
    };

    const handleConfirmPasswordChange = (confirmPassword: string) => {
        setFormData({ ...formData, confirmPassword });
        setValidations({
            ...validations,
            passwordMatch: formData.password === confirmPassword
        });
    };

    const handleUsernameChange = (username: string) => {
        setFormData({ ...formData, username });
        setValidations({
            ...validations,
            usernameUnique: username.length >= 3 && !["admin", "test", "user"].includes(username.toLowerCase())
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log("formData:", formData);

        const { email, phone, rank, name, note, username, password, confirmPassword } = formData;

        if (!email || !phone || !rank || !name || !note || !username || !password || !confirmPassword) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (!validations.passwordStrength) {
            toast.error("Password must be at least 8 characters with uppercase, number, and special character");
            return;
        }

        if (!validations.passwordMatch) {
            toast.error("Passwords do not match");
            return;
        }

        if (!validations.usernameUnique) {
            toast.error("Username is not available");
            return;
        }

        try {
            const response = await api.post<{ message: string }>(
                endpoints.auth.signup,
                {
                    username,
                    name,
                    email,
                    phone,
                    rank,
                    password,
                    confirmPassword,
                    note,
                },
                { baseURL }
            );

            toast.success("Account Created Successfully!");
            router.push("/login");

        } catch (err) {
            if (err instanceof ApiClientError) {
                toast.error(err.message || "Signup failed");
                console.error("Signup error:", err);
            } else {
                toast.error("Unexpected error. Please try again.");
                console.error(err);
            }
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
                        <CardTitle className="text-center text-primary">
                            New User Registration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 XXXXX XXXXX"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="rank">Rank</Label>
                                    <Input
                                        id="rank"
                                        type="text"
                                        value={formData.rank}
                                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                        placeholder="e.g., Captain, Major"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>


                            <div className="space-y-2">
                                <Label htmlFor="username">Unique Username</Label>
                                <div className="relative">
                                    <Input
                                        id="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => handleUsernameChange(e.target.value)}
                                        placeholder="Choose a unique username"
                                        required
                                    />
                                    {formData.username && (
                                        <div className="absolute right-3 top-3">
                                            {validations.usernameUnique ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => handlePasswordChange(e.target.value)}
                                        placeholder="Create a strong password"
                                        required
                                    />
                                    {formData.password && (
                                        <div className="absolute right-3 top-3">
                                            {validations.passwordStrength ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Must be 8+ characters with uppercase, number, and special character
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                    />
                                    {formData.confirmPassword && (
                                        <div className="absolute right-3 top-3">
                                            {validations.passwordMatch ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="note">Note</Label>
                                <Input
                                    id="note"
                                    type="text"
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

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
