"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ocTabs } from "@/config/app.config";
import UserFormDialog from "@/components/users/UserFormDialog";
import { UserListItem } from "@/components/users/UserCard";
import UserFilters from "@/components/users/UserFilters";
import { useUsers } from "@/hooks/useUsers";
import type { User } from "@/app/lib/api/userApi";
import { useDebouncedValue } from "@/app/lib/debounce";

export default function UserManagement() {
  const { users, loading, addUser, editUser, removeUser } = useUsers();

  const { register, handleSubmit, reset, setValue, watch } = useForm<User>();
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filter states
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const debouncedSearch = useDebouncedValue(search, 350);

  // Filter users based on search and filters (client-side filtering)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch =
        !debouncedSearch ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "disabled" && !user.isActive);

      const matchesRole = !roleFilter || user.rank?.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, debouncedSearch, statusFilter, roleFilter]);

  /** SAVE USER */
  const onSubmit = async (data: User) => {
    try {
      if (editingUser && editingUser.id) {
        await editUser(editingUser.id, data);
      } else {
        await addUser(data);
      }

      reset();
      setEditingUser(null);
      setOpen(false);
    } catch (error) {
      // Error already handled by mutation
      console.error("Failed to save user:", error);
    }
  };

  /** EDIT HANDLER */
  const handleEdit = (user: User) => {
    setEditingUser(user);
    reset(user);
    setOpen(true);
  };

  /** DELETE HANDLER */
  const handleDelete = async (user: User) => {
    if (!user.id) return;
    try {
      await removeUser(user.id);
    } catch (error) {
      // Error already handled by mutation
      console.error("Failed to delete user:", error);
    }
  };

  /** VIEW HANDLER */
  const handleView = (user: User) => {
    setSelectedUser(user);
    setViewOpen(true);
  };

  return (
    <SidebarProvider>
      <section className="flex min-h-screen w-full">
        <AppSidebar />

        <main className="flex-1 flex flex-col">
          <PageHeader title="User Management" description="Manage user access and roles" />

          <section className="p-6 flex-1">
            <BreadcrumbNav
              paths={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Gen Mgmt", href: "/dashboard/genmgmt" },
                { label: "User Management" },
              ]}
            />

            <GlobalTabs tabs={ocTabs} defaultValue="user-mgmt">
              <TabsContent value="user-mgmt" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">User List</h2>
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

                {/* Search and Filters */}
                <UserFilters
                  search={search}
                  onSearch={setSearch}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  roleFilter={roleFilter}
                  onRoleChange={setRoleFilter}
                />

                {loading ? (
                  <p className="text-center py-4 text-muted-foreground">Loading...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    {debouncedSearch || statusFilter || roleFilter
                      ? "No users found matching your filters"
                      : "No users available"}
                  </p>
                ) : (
                  <div className="divide-y border rounded-md">
                    {filteredUsers.map((u) => {
                      const {
                        id = "",
                        username = "N/A",
                        name = "Unknown",
                        email = "N/A",
                        phone = "N/A",
                        rank = "N/A",
                        appointId = "N/A",
                        isActive = false,
                      } = u;

                      return (
                        <UserListItem
                          key={id}
                          id={id}
                          username={username}
                          fullName={name}
                          persNo={email}
                          rank={rank}
                          unit={appointId ?? undefined}
                          role={rank}
                          status={isActive ? "active" : "disabled"}
                          onEdit={() => handleEdit(u)}
                          onView={() => handleView(u)}
                          onDelete={() => handleDelete(u)}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </GlobalTabs>
          </section>
        </main>
      </section>

      {/* Add/Edit Modal */}
      <UserFormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit(onSubmit)}
        register={register}
        setValue={setValue}
        editingUser={editingUser}
        isActive={watch("isActive") ?? true}
      />

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-2">
              <p>
                <b>Name:</b> {selectedUser.name ?? "N/A"}
              </p>
              <p>
                <b>Email:</b> {selectedUser.email ?? "N/A"}
              </p>
              <p>
                <b>Phone:</b> {selectedUser.phone ?? "N/A"}
              </p>
              <p>
                <b>Rank:</b> {selectedUser.rank ?? "N/A"}
              </p>
              <p>
                <b>Status:</b> {selectedUser.isActive ? "Active" : "Disabled"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}