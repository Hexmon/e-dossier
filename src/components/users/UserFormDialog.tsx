"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { IndiaPhoneInput } from "@/components/ui/india-phone-input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { UseFormRegister, UseFormHandleSubmit, UseFormSetValue } from "react-hook-form";
import { User } from "@/app/lib/api/userApi";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: ReturnType<UseFormHandleSubmit<User>>;
    register: UseFormRegister<User>;
    setValue: UseFormSetValue<User>;
    editingUser: User | null;
    isActive: boolean;
    usernameValue: string;
    phoneValue: string;
}

export default function UserFormDialog({
    open,
    onOpenChange,
    onSubmit,
    register,
    setValue,
    editingUser,
    isActive,
    usernameValue,
    phoneValue,
}: Props) {
    const usernameTooShort = usernameValue.trim().length > 0 && usernameValue.trim().length < 3;
    const passwordLabel = editingUser ? "Reset Password" : "Initial Password";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="user-username">Username</Label>
                            <Input
                                id="user-username"
                                placeholder="Username"
                                autoComplete="username"
                                {...register("username")}
                                className={usernameTooShort ? "border-destructive border-dotted focus-visible:ring-destructive" : undefined}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-name">Full Name</Label>
                            <Input id="user-name" placeholder="Full Name" autoComplete="name" {...register("name")} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-email">Email</Label>
                            <Input id="user-email" type="email" placeholder="name@example.com" autoComplete="email" {...register("email")} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-phone">Phone</Label>
                            <IndiaPhoneInput
                                id="user-phone"
                                value={phoneValue}
                                onValueChange={(value) => setValue("phone", value, { shouldDirty: true, shouldValidate: true })}
                                placeholder="9876543210"
                                autoComplete="tel-national"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-rank">Rank</Label>
                            <Input id="user-rank" placeholder="Rank" {...register("rank")} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="user-password">{passwordLabel}</Label>
                            <PasswordInput
                                id="user-password"
                                placeholder={editingUser ? "Leave blank to keep unchanged" : "Set initial password"}
                                autoComplete="new-password"
                                {...register("password")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="user-confirm-password">Confirm Password</Label>
                            <PasswordInput
                                id="user-confirm-password"
                                placeholder="Confirm password"
                                autoComplete="new-password"
                                {...register("confirmPassword")}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Active users need a password before they can log in. Inactive users may be saved without a password.
                    </p>
                    <div className="flex gap-2 items-center">
                        <Checkbox
                            checked={isActive}
                            onCheckedChange={(val) => setValue("isActive", !!val)}
                        />
                        <span>Active</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </DialogFooter>

                </form>
            </DialogContent>
        </Dialog>
    );
}
