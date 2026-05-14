"use client";

import { useState } from "react";
import { toast } from "sonner";

import { changePassword } from "@/app/lib/api/authApi";
import { passwordConfirmationError } from "@/app/lib/users/credential-policy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !saving) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    const mismatch = passwordConfirmationError({ password: newPassword, confirmPassword });
    if (mismatch) {
      toast.error(mismatch);
      return;
    }
    if (!currentPassword.trim()) {
      toast.error("Enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("Enter a new password.");
      return;
    }

    try {
      setSaving(true);
      const response = await changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(response.message || "Password changed successfully.");
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Confirm your current password before setting a new password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="change-current-password">Current Password</Label>
            <PasswordInput
              id="change-current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="change-new-password">New Password</Label>
            <PasswordInput
              id="change-new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="change-confirm-password">Confirm Password</Label>
            <PasswordInput
              id="change-confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Changing..." : "Change Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
