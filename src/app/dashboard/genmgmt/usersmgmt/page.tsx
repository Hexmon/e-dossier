"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { fallbackUsers, ocTabs } from "@/config/app.config";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { UserListItem } from "@/components/users/UserCard";
import { getAllUsers, saveUser, deleteUser, User } from "@/app/lib/api/userApi";
import UserFormDialog from "@/components/users/UserFormDialog";

export default function UserManagement() {
  const router = useRouter();
  const { register, handleSubmit, reset, setValue, watch } = useForm<User>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const isActive = watch("isActive");

  //  Fetch all users
  const loadUsers = useCallback(async () => {
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Unable to load user list");
      setUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  //  Add / Edit User
  const onSubmit = useCallback(async (data: User) => {
    try {
      const saved = await saveUser(data);
      setUsers((prev) =>
        editingUser
          ? prev.map((u) => (u.id === saved.id ? saved : u))
          : [...prev, saved]
      );
      toast.success(editingUser ? "User updated successfully" : "User added successfully");
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  }, [editingUser, reset]);

  const handleEdit = useCallback((user: User) => {
    setEditingUser(user);
    reset(user);
    setOpen(true);
  }, [reset]);

  const handleDelete = useCallback(async (user: User) => {
    if (!user.id) {
      setUsers((prev) => prev.filter((u) => u.username !== user.username));
      return;
    }
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  }, []);

  const handleView = useCallback((user: User) => {
    setSelectedUser(user);
    setViewOpen(true);
  }, []);

  const handleLogout = () => router.push("/login");

  return (
    <SidebarProvider>
      <section className="min-h-screen flex w-full bg-background">
        <aside><AppSidebar /></aside>
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="User Management"
              description="Manage user access and roles"
              onLogout={handleLogout}
            />
          </header>

          <section className="flex-1 p-6">
            <nav>
              <BreadcrumbNav
                paths={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                  { label: "User Management" },
                ]}
              />
            </nav>

            <GlobalTabs tabs={ocTabs} defaultValue="user-mgmt">
              <TabsContent value="user-mgmt" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">User List</h2>
                  <Button
                    onClick={() => {
                      reset({ isActive: true });
                      setEditingUser(null);
                      setOpen(true);
                    }}
                  >
                    Add User
                  </Button>
                </div>

                {loading ? (
                  <p className="text-center p-4 text-muted-foreground">Loading users...</p>
                ) : (
                  <div className="divide-y border rounded-md">
                    {users.map((user, idx) => (
                      <UserListItem
                        key={user.id || idx}
                        id={user.id || idx.toString()}
                        username={user.username}
                        fullName={user.name}
                        role={user.rank || "N/A"}
                        persNo={user.email || "N/A"}
                        rank={user.rank || "N/A"}
                        unit={user.appointId || "N/A"}
                        status={user.isActive ? "active" : "disabled"}
                        onEdit={() => handleEdit(user)}
                        onView={() => handleView(user)}
                        onDelete={() => handleDelete(user)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      {/*  Add/Edit Dialog */}
      <UserFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit(onSubmit)}
        editingUser={editingUser}
        register={register}
        setValue={setValue}
         isActive={watch("isActive") ?? true}
      />

      {/*  View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-2">
              <p><b>Username:</b> {selectedUser.username}</p>
              <p><b>Full Name:</b> {selectedUser.name}</p>
              <p><b>Email:</b> {selectedUser.email}</p>
              <p><b>Phone:</b> {selectedUser.phone}</p>
              <p><b>Rank:</b> {selectedUser.rank}</p>
              <p><b>Active:</b> {selectedUser.isActive ? "Yes" : "No"}</p>
              <p><b>Created:</b> {selectedUser.createdAt && new Date(selectedUser.createdAt).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
