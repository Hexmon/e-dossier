"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormRegister, UseFormHandleSubmit, UseFormSetValue } from "react-hook-form";
import { User } from "@/app/lib/api/userApi";

interface UserFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: ReturnType<UseFormHandleSubmit<User>>;
    register: UseFormRegister<User>;
    setValue: UseFormSetValue<User>;
    editingUser: User | null;
    isActive: boolean;
}

export default function UserFormDialog({
    open,
    onOpenChange,
    onSubmit,
    register,
    setValue,
    editingUser,
    isActive,
}: UserFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <Input placeholder="Username" {...register("username", { required: true })} />
                    <Input placeholder="Full Name" {...register("name", { required: true })} />
                    <Input placeholder="Email" {...register("email")} />
                    <Input placeholder="Phone" {...register("phone")} />
                    <Input placeholder="Rank" {...register("rank")} />

                    <div className="flex items-center gap-2">
                        <Checkbox checked={isActive ?? true} onCheckedChange={(val) => setValue("isActive", !!val)} />
                        <label className="text-sm font-medium">Is Active</label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">{editingUser ? "Update" : "Save"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
