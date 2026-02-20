"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useOlqAdminTemplateMgmt } from "@/hooks/useOlqAdminTemplateMgmt";
import type { OlqAdminCategory, OlqAdminSubtitle } from "@/types/olq-admin";

const categoryFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(50, "Max 50 characters"),
  title: z.string().trim().min(1, "Title is required").max(255, "Max 255 characters"),
  description: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  displayOrder: z.number().int().min(0).optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const subtitleFormSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  subtitle: z.string().trim().min(1, "Subtitle is required").max(255, "Max 255 characters"),
  maxMarks: z.number().int().min(0, "Cannot be negative").optional(),
  displayOrder: z.number().int().min(0).optional(),
});

type SubtitleFormValues = z.infer<typeof subtitleFormSchema>;

const COPY_MODE = "replace" as const;

function formatCourseLabel(code: string, title: string): string {
  const c = code.trim();
  const t = title.trim();
  if (!c && !t) return "Unnamed Course";
  if (!t) return c;
  if (!c) return t;
  return `${c} - ${t}`;
}

function generateCategoryCodeFromTitle(title: string): string {
  return title
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function applyZodErrors<T extends Record<string, unknown>>(
  issues: z.ZodIssue[],
  setError: (name: keyof T, error: { type: string; message?: string }) => void
) {
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      setError(field as keyof T, { type: "manual", message: issue.message });
    }
  }
}

export default function ModuleMgmtOlqCard() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"categories" | "subtitles" | "copy">("categories");

  const [categorySearch, setCategorySearch] = useState("");
  const [subtitleSearch, setSubtitleSearch] = useState("");
  const [subtitleCategoryFilter, setSubtitleCategoryFilter] = useState<string>("all");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OlqAdminCategory | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<OlqAdminCategory | null>(null);

  const [subtitleDialogOpen, setSubtitleDialogOpen] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState<OlqAdminSubtitle | null>(null);
  const [subtitleDeleteTarget, setSubtitleDeleteTarget] = useState<OlqAdminSubtitle | null>(null);

  const [copySourceCourseId, setCopySourceCourseId] = useState<string>("");
  const [copyTargetCourseId, setCopyTargetCourseId] = useState<string>("");
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);

  const {
    courses,
    coursesLoading,
    categories,
    categoriesLoading,
    subtitles,
    subtitlesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubtitle,
    updateSubtitle,
    deleteSubtitle,
    copyTemplate,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
    isCreatingSubtitle,
    isUpdatingSubtitle,
    isDeletingSubtitle,
    isCopyingTemplate,
  } = useOlqAdminTemplateMgmt({
    courseId: selectedCourseId || null,
    subtitleCategoryId: subtitleCategoryFilter === "all" ? null : subtitleCategoryFilter,
    includeSubtitles: true,
    isActive: true,
  });

  const categoryForm = useForm<CategoryFormValues>({
    defaultValues: {
      code: "",
      title: "",
      description: "",
      displayOrder: 0,
    },
  });

  const subtitleForm = useForm<SubtitleFormValues>({
    defaultValues: {
      categoryId: "",
      subtitle: "",
      maxMarks: 20,
      displayOrder: 0,
    },
  });

  const coursesSorted = useMemo(
    () => [...courses].sort((a, b) => a.code.localeCompare(b.code)),
    [courses]
  );

  const selectedCourse = useMemo(
    () => coursesSorted.find((course) => course.id === selectedCourseId) ?? null,
    [coursesSorted, selectedCourseId]
  );

  const categoryLookup = useMemo(() => {
    return categories.reduce<Record<string, OlqAdminCategory>>((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

  const categorySubtitleCount = useMemo(() => {
    return categories.reduce((count, category) => count + (category.subtitles?.length ?? 0), 0);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((category) => {
      return (
        category.code.toLowerCase().includes(q) ||
        category.title.toLowerCase().includes(q) ||
        (category.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [categories, categorySearch]);

  const filteredSubtitles = useMemo(() => {
    const q = subtitleSearch.trim().toLowerCase();
    if (!q) return subtitles;

    return subtitles.filter((subtitle) => {
      const categoryName = categoryLookup[subtitle.categoryId]?.title ?? "";
      return (
        subtitle.subtitle.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q)
      );
    });
  }, [subtitles, subtitleSearch, categoryLookup]);

  const canMutate = Boolean(selectedCourseId);
  const canCopy =
    Boolean(copySourceCourseId) &&
    Boolean(copyTargetCourseId) &&
    copySourceCourseId !== copyTargetCourseId;
  const watchedCategoryTitle = categoryForm.watch("title");

  useEffect(() => {
    if (!selectedCourseId) return;
    setCopyTargetCourseId(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (editingCategory) return;
    categoryForm.setValue("code", generateCategoryCodeFromTitle(watchedCategoryTitle || ""), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [watchedCategoryTitle, editingCategory, categoryForm]);

  const openCreateCategory = () => {
    if (!canMutate) return;
    setEditingCategory(null);
    categoryForm.reset({
      code: "",
      title: "",
      description: "",
      displayOrder: categories.length,
    });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: OlqAdminCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      code: category.code,
      title: category.title,
      description: category.description ?? "",
      displayOrder: category.displayOrder,
    });
    setCategoryDialogOpen(true);
  };

  const onCategorySubmit = categoryForm.handleSubmit(async (values) => {
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors<CategoryFormValues>(parsed.error.issues, categoryForm.setError);
      return;
    }

    const computedCode = editingCategory
      ? parsed.data.code
      : generateCategoryCodeFromTitle(parsed.data.title);

    const payload = {
      code: computedCode,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      displayOrder: parsed.data.displayOrder ?? 0,
      isActive: true,
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    } catch {
      // Toast handled by hook
    }
  });

  const onConfirmDeleteCategory = async () => {
    if (!categoryDeleteTarget) return;
    try {
      await deleteCategory(categoryDeleteTarget.id);
      setCategoryDeleteTarget(null);
    } catch {
      // Toast handled by hook
    }
  };

  const openCreateSubtitle = () => {
    if (!canMutate) return;
    const defaultCategoryId =
      subtitleCategoryFilter !== "all" ? subtitleCategoryFilter : categories[0]?.id ?? "";
    setEditingSubtitle(null);
    subtitleForm.reset({
      categoryId: defaultCategoryId,
      subtitle: "",
      maxMarks: 20,
      displayOrder: subtitles.length,
    });
    setSubtitleDialogOpen(true);
  };

  const openEditSubtitle = (subtitle: OlqAdminSubtitle) => {
    setEditingSubtitle(subtitle);
    subtitleForm.reset({
      categoryId: subtitle.categoryId,
      subtitle: subtitle.subtitle,
      maxMarks: subtitle.maxMarks,
      displayOrder: subtitle.displayOrder,
    });
    setSubtitleDialogOpen(true);
  };

  const onSubtitleSubmit = subtitleForm.handleSubmit(async (values) => {
    const parsed = subtitleFormSchema.safeParse(values);
    if (!parsed.success) {
      applyZodErrors<SubtitleFormValues>(parsed.error.issues, subtitleForm.setError);
      return;
    }

    const payload = {
      categoryId: parsed.data.categoryId,
      subtitle: parsed.data.subtitle,
      maxMarks: parsed.data.maxMarks ?? 20,
      displayOrder: parsed.data.displayOrder ?? 0,
      isActive: true,
    };

    try {
      if (editingSubtitle) {
        await updateSubtitle(editingSubtitle.id, payload);
      } else {
        await createSubtitle(payload);
      }
      setSubtitleDialogOpen(false);
      setEditingSubtitle(null);
      subtitleForm.reset();
    } catch {
      // Toast handled by hook
    }
  });

  const onConfirmDeleteSubtitle = async () => {
    if (!subtitleDeleteTarget) return;
    try {
      await deleteSubtitle(subtitleDeleteTarget.id);
      setSubtitleDeleteTarget(null);
    } catch {
      // Toast handled by hook
    }
  };

  const onTriggerCopy = () => {
    if (!canCopy) {
      toast.error("Select source and target courses, and keep them different.");
      return;
    }
    setCopyConfirmOpen(true);
  };

  const onConfirmCopy = async () => {
    if (!canCopy) return;
    try {
      await copyTemplate(copyTargetCourseId, copySourceCourseId, COPY_MODE);
      setCopyConfirmOpen(false);
    } catch {
      // Toast handled by hook
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">OLQ Template Management</CardTitle>
        <CardDescription>OLQ Template Management</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="olq-course-select">Course</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger id="olq-course-select" className="w-full">
                <SelectValue placeholder={coursesLoading ? "Loading courses..." : "Select course"} />
              </SelectTrigger>
              <SelectContent>
                {coursesSorted.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {formatCourseLabel(course.code, course.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Template Stats</p>
            {selectedCourse ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium">{formatCourseLabel(selectedCourse.code, selectedCourse.title)}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Categories: {categories.length}</Badge>
                  <Badge variant="secondary">Subtitles: {categorySubtitleCount}</Badge>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Select a course to view template details.</p>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="subtitles">Subtitles</TabsTrigger>
            <TabsTrigger value="copy">Copy</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search categories"
                  disabled={!canMutate}
                />
              </div>
              <Button onClick={openCreateCategory} disabled={!canMutate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>

            {!canMutate ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select a course to manage categories.
              </div>
            ) : categoriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No categories found.</p>
                <Button variant="outline" className="mt-3" onClick={openCreateCategory}>
                  Add Category
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      <th className="px-3 py-2 text-left font-medium">Title</th>
                      <th className="px-3 py-2 text-left font-medium">Order</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Subtitles</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{category.code}</td>
                        <td className="px-3 py-2">
                          <p>{category.title}</p>
                          {category.description ? (
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{category.displayOrder}</td>
                        <td className="px-3 py-2">
                          <Badge variant={category.isActive ? "secondary" : "outline"}>
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{category.subtitles?.length ?? 0}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditCategory(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => setCategoryDeleteTarget(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subtitles" className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={subtitleSearch}
                    onChange={(event) => setSubtitleSearch(event.target.value)}
                    className="pl-9"
                    placeholder="Search subtitles"
                    disabled={!canMutate}
                  />
                </div>
                <Select
                  value={subtitleCategoryFilter}
                  onValueChange={setSubtitleCategoryFilter}
                  disabled={!canMutate || categories.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={openCreateSubtitle} disabled={!canMutate || categories.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subtitle
              </Button>
            </div>

            {!canMutate ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select a course to manage subtitles.
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Add at least one category first before creating subtitles.
              </div>
            ) : subtitlesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredSubtitles.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No subtitles found.</p>
                <Button variant="outline" className="mt-3" onClick={openCreateSubtitle}>
                  Add Subtitle
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Subtitle</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-left font-medium">Max Marks</th>
                      <th className="px-3 py-2 text-left font-medium">Order</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubtitles.map((subtitle) => (
                      <tr key={subtitle.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{subtitle.subtitle}</td>
                        <td className="px-3 py-2">
                          {categoryLookup[subtitle.categoryId]?.title ?? "-"}
                        </td>
                        <td className="px-3 py-2">{subtitle.maxMarks}</td>
                        <td className="px-3 py-2">{subtitle.displayOrder}</td>
                        <td className="px-3 py-2">
                          <Badge variant={subtitle.isActive ? "secondary" : "outline"}>
                            {subtitle.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSubtitle(subtitle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => setSubtitleDeleteTarget(subtitle)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="copy" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="copy-source-course">Source Course</Label>
                <Select value={copySourceCourseId} onValueChange={setCopySourceCourseId}>
                  <SelectTrigger id="copy-source-course" className="w-full">
                    <SelectValue placeholder="Select source course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesSorted.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {formatCourseLabel(course.code, course.title)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copy-target-course">Target Course</Label>
                <Select value={copyTargetCourseId} onValueChange={setCopyTargetCourseId}>
                  <SelectTrigger id="copy-target-course" className="w-full">
                    <SelectValue placeholder="Select target course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesSorted.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {formatCourseLabel(course.code, course.title)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copy-mode">Copy Mode</Label>
              <Select value={COPY_MODE} disabled>
                <SelectTrigger id="copy-mode" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COPY_MODE}>replace</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Replace mode deactivates current target template and copies source template.
              </p>
            </div>

            {copySourceCourseId && copyTargetCourseId && copySourceCourseId === copyTargetCourseId ? (
              <p className="text-sm text-destructive">
                Source and target courses must be different.
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={onTriggerCopy} disabled={!canCopy || isCopyingTemplate}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Now
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            categoryForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Category templates are course-specific and managed only by admin.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={onCategorySubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-code">Code</Label>
              <Input
                id="category-code"
                {...categoryForm.register("code")}
                disabled
                title="Code is auto-generated from title"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from title in uppercase with underscores.
              </p>
              {categoryForm.formState.errors.code ? (
                <p className="text-xs text-destructive">{categoryForm.formState.errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-title">Title</Label>
              <Input id="category-title" {...categoryForm.register("title")} />
              {categoryForm.formState.errors.title ? (
                <p className="text-xs text-destructive">{categoryForm.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input id="category-description" {...categoryForm.register("description")} />
              {categoryForm.formState.errors.description ? (
                <p className="text-xs text-destructive">
                  {categoryForm.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-display-order">Display Order</Label>
              <Input
                id="category-display-order"
                type="number"
                min={0}
                {...categoryForm.register("displayOrder", {
                  setValueAs: (value) => (value === "" ? undefined : Number(value)),
                })}
              />
              {categoryForm.formState.errors.displayOrder ? (
                <p className="text-xs text-destructive">
                  {categoryForm.formState.errors.displayOrder.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCategory || isUpdatingCategory || categoryForm.formState.isSubmitting}
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={subtitleDialogOpen}
        onOpenChange={(open) => {
          setSubtitleDialogOpen(open);
          if (!open) {
            setEditingSubtitle(null);
            subtitleForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubtitle ? "Edit Subtitle" : "Add Subtitle"}</DialogTitle>
            <DialogDescription>
              Subtitles must belong to a category in the selected course template.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={onSubtitleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="subtitle-category">Category</Label>
              <Select
                value={subtitleForm.watch("categoryId") || ""}
                onValueChange={(value) => subtitleForm.setValue("categoryId", value, { shouldValidate: true })}
              >
                <SelectTrigger id="subtitle-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subtitleForm.formState.errors.categoryId ? (
                <p className="text-xs text-destructive">
                  {subtitleForm.formState.errors.categoryId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle-title">Subtitle</Label>
              <Input id="subtitle-title" {...subtitleForm.register("subtitle")} />
              {subtitleForm.formState.errors.subtitle ? (
                <p className="text-xs text-destructive">
                  {subtitleForm.formState.errors.subtitle.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subtitle-max-marks">Max Marks</Label>
                <Input
                  id="subtitle-max-marks"
                  type="number"
                  min={0}
                  {...subtitleForm.register("maxMarks", {
                    setValueAs: (value) => (value === "" ? undefined : Number(value)),
                  })}
                />
                {subtitleForm.formState.errors.maxMarks ? (
                  <p className="text-xs text-destructive">
                    {subtitleForm.formState.errors.maxMarks.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle-display-order">Display Order</Label>
                <Input
                  id="subtitle-display-order"
                  type="number"
                  min={0}
                  {...subtitleForm.register("displayOrder", {
                    setValueAs: (value) => (value === "" ? undefined : Number(value)),
                  })}
                />
                {subtitleForm.formState.errors.displayOrder ? (
                  <p className="text-xs text-destructive">
                    {subtitleForm.formState.errors.displayOrder.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubtitleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingSubtitle || isUpdatingSubtitle || subtitleForm.formState.isSubmitting}
              >
                {editingSubtitle ? "Save Changes" : "Create Subtitle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(categoryDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setCategoryDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This hard delete can remove template nodes permanently. Historical score links may still rely
              on inactive template strategy, so use with caution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCategory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingCategory}
              onClick={onConfirmDeleteCategory}
            >
              {isDeletingCategory ? "Deleting..." : "Yes, Delete Hard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(subtitleDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setSubtitleDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subtitle permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This hard delete permanently removes the subtitle from the selected course template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSubtitle}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingSubtitle}
              onClick={onConfirmDeleteSubtitle}
            >
              {isDeletingSubtitle ? "Deleting..." : "Yes, Delete Hard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyConfirmOpen} onOpenChange={setCopyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy template in replace mode?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the target course active template and replace it with source course
              template categories and subtitles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopyingTemplate}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isCopyingTemplate} onClick={onConfirmCopy}>
              {isCopyingTemplate ? "Copying..." : "Yes, Copy Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
