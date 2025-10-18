"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { UserListItem } from "@/components/users/UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import GlobalTabs from "@/components/Tabs/GlobalTabs";
import { ocTabs } from "@/config/app.config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TabsContent } from "@/components/ui/tabs";

export default function UserManagement() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  const [users, setUsers] = useState([
    {
      UserName: "admin.roy",
      PersNo: "1001",
      Rank: "Maj",
      FullName: "Admin Roy",
      Unit: "MCEME",
      Role: "Administrator",
      status: "active",
    },
    {
      UserName: "kumar.staff",
      PersNo: "1002",
      Rank: "Capt",
      FullName: "Staff Kumar",
      Unit: "MCEME",
      Role: "Staff Officer",
      status: "active",
    },
    {
      UserName: "patel.cmdr",
      PersNo: "1003",
      Rank: "Cmdr",
      FullName: "Cmdr. Patel",
      Unit: "MCEME",
      Role: "Platoon Commander",
      status: "active",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [viewUser, setViewUser] = useState<any | null>(null);

  const [formData, setFormData] = useState<any>({
    username: "",
    unit: "",
    persNo: "",
    rank: "",
    name: "",
    userType: "",
    role: "",
    platoon: "",
    isActive: true,
    resetPwd: false,
    createdDate: new Date().toISOString().split("T")[0],
    approvedDate: new Date().toISOString().split("T")[0],
  });

  const handleChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      const updatedUsers = [...users];
      updatedUsers[editingIndex] = {
        UserName: formData.username,
        PersNo: formData.persNo,
        Rank: formData.rank,
        FullName: formData.name,
        Unit: formData.unit,
        Role: formData.role,
        status: formData.isActive ? "active" : "disabled",
      };
      setUsers(updatedUsers);
    } else {
      setUsers([
        ...users,
        {
          UserName: formData.username,
          PersNo: formData.persNo,
          Rank: formData.rank,
          FullName: formData.name,
          Unit: formData.unit,
          Role: formData.role,
          status: formData.isActive ? "active" : "disabled",
        },
      ]);
    }
    setOpen(false);
    setEditingIndex(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      username: "",
      unit: "",
      persNo: "",
      rank: "",
      name: "",
      userType: "",
      role: "",
      platoon: "",
      isActive: true,
      resetPwd: false,
      createdDate: new Date().toISOString().split("T")[0],
      approvedDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleEdit = (index: number) => {
    const user = users[index];
    setFormData({
      username: user.UserName,
      unit: user.Unit,
      persNo: user.PersNo,
      rank: user.Rank,
      name: user.FullName,
      role: user.Role,
      isActive: user.status === "active",
      resetPwd: false,
      createdDate: new Date().toISOString().split("T")[0],
      approvedDate: new Date().toISOString().split("T")[0],
    });
    setEditingIndex(index);
    setOpen(true);
  };

  const handleView = (user: any) => {
    setViewUser(user);
    setViewOpen(true);
  };

  const handleDelete = (index: number) => {
    const updatedUsers = [...users];
    updatedUsers.splice(index, 1);
    setUsers(updatedUsers);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
            <PageHeader
              title="User Management"
              description="Manage user access and roles in MCEME"
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
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setEditingIndex(null);
                      setOpen(true);
                    }}
                  >
                    Add User
                  </Button>
                </div>

                <div className="divide-y border rounded-md">
                  {users
                    .filter(user =>
                      user.UserName.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user, index) => (
                      <UserListItem
                        key={index}
                        id={index.toString()}
                        username={user.UserName}
                        fullName={user.FullName}
                        role={user.Role}
                        persNo={user.PersNo}
                        rank={user.Rank}
                        unit={user.Unit}
                        status={user.status as "active" | "suspended" | "disabled"}
                        onEdit={() => handleEdit(index)}
                        onView={() => handleView(user)}
                        onDelete={() => handleDelete(index)}
                      />
                    ))}
                </div>
              </TabsContent>
            </GlobalTabs>
          </main>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {["username", "unit", "persNo", "rank", "name", "platoon"].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {field}
                </label>
                <Input
                  value={formData[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-1">User Type</label>
              <Select
                onValueChange={(val) => {
                  handleChange("userType", val);
                  handleChange("role", val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User Type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Comdt",
                    "DCCI",
                    "Cdr CTW",
                    "DyCdr CTW",
                    "DS Cord",
                    "HOAT",
                    "Platoon Cdr",
                    "CCO",
                    "User",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={formData.isActive} onCheckedChange={(val) => handleChange("isActive", !!val)} />
              <label className="text-sm font-medium">Is Active</label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={formData.resetPwd} onCheckedChange={(val) => handleChange("resetPwd", !!val)} />
              <label className="text-sm font-medium">Reset Password</label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Created Date</label>
              <Input type="date" value={formData.createdDate} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Approved Date</label>
              <Input type="date" value={formData.approvedDate} readOnly />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-2">
              <p><b>UserName:</b> {viewUser.UserName}</p>
              <p><b>Full Name:</b> {viewUser.FullName}</p>
              <p><b>Rank:</b> {viewUser.Rank}</p>
              <p><b>Pers No:</b> {viewUser.PersNo}</p>
              <p><b>Unit:</b> {viewUser.Unit}</p>
              <p><b>Role:</b> {viewUser.Role}</p>
              <p><b>Status:</b> {viewUser.status}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
