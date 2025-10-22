"use client";

import { useEffect, useState } from "react";
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

const USER_ROLES = ["Comdt", "DCCI", "Cdr CTW", "DyCdr CTW", "DS Cord", "HOAT", "Platoon Cdr", "CCO", "User"];

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
  useEffect(() => {
    const loadUsers = async () => {
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
    };
    loadUsers();
  }, []);

  //  Add / Edit User
  const onSubmit = async (data: User) => {
    try {
      const saved = await saveUser(data);
      if (editingUser) {
        setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
        toast.success("User updated successfully");
      } else {
        setUsers((prev) => [...prev, saved]);
        toast.success("User added successfully");
      }
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  };

  //  Edit
  const handleEdit = (user: User) => {
    setEditingUser(user);
    reset(user);
    setOpen(true);
  };

  //  Delete
  const handleDelete = async (user: User) => {
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
  };

  //  View
  const handleView = (user: User) => {
    setSelectedUser(user);
    setViewOpen(true);
  };

  const handleLogout = () => router.push("/login");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="User Management"
              description="Manage user access and roles"
              onLogout={handleLogout}
            />
          </header>

          <main className="flex-1 p-6">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                { label: "User Management" },
              ]}
            />

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
          </main>
        </div>
      </div>

      {/*  Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Input placeholder="Username" {...register("username", { required: true })} />
            <Input placeholder="Full Name" {...register("name", { required: true })} />
            <Input placeholder="Email" {...register("email")} />
            <Input placeholder="Phone" {...register("phone")} />
            <Input placeholder="Rank" {...register("rank")} />

            <Select onValueChange={(v) => setValue("appointId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox checked={isActive} onCheckedChange={(val) => setValue("isActive", !!val)} />
              <label className="text-sm font-medium">Is Active</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
