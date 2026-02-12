"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
}: Props) {
    const usernameTooShort = usernameValue.trim().length > 0 && usernameValue.trim().length < 3;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-3">

                    <Input
                        placeholder="Username"
                        {...register("username")}
                        className={usernameTooShort ? "border-red-600 border-dotted focus-visible:ring-red-600" : undefined}
                    />
                    <Input placeholder="Full Name" {...register("name")} />
                    <Input placeholder="Email" {...register("email")} />
                    <Input placeholder="Phone" {...register("phone")} />
                    <Input placeholder="Rank" {...register("rank")} />

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
