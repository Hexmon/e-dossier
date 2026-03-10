"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SafeImage from "@/components/site-settings/SafeImage";
import { Platoon, PlatoonFormData } from "@/types/platoon";
import { SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES } from "@/app/lib/validators.site-settings";
import { presignPlatoonImage } from "@/app/lib/api/platoonApi";
import { DEFAULT_PLATOON_THEME_COLOR, normalizePlatoonThemeColor } from "@/lib/platoon-theme";

interface PlatoonFormProps {
  platoon?: Platoon;
  onSubmit: (data: PlatoonFormData) => void;
  onCancel: () => void;
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only PNG, JPEG, and WEBP files are allowed.";
  }

  if (file.size > SITE_SETTINGS_IMAGE_MAX_SIZE_BYTES) {
    return "Image exceeds max size of 2MB.";
  }

  return null;
}

export default function PlatoonForm({ platoon, onSubmit, onCancel }: PlatoonFormProps) {
  const [formData, setFormData] = useState<PlatoonFormData>({
    key: "",
    name: "",
    about: "",
    themeColor: DEFAULT_PLATOON_THEME_COLOR,
    imageUrl: null,
    imageObjectKey: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  useEffect(() => {
    if (platoon) {
      const { key, name, about, themeColor, imageUrl, imageObjectKey } = platoon;

      setFormData({
        key: key ?? "",
        name: name ?? "",
        about: about ?? "",
        themeColor: normalizePlatoonThemeColor(themeColor ?? DEFAULT_PLATOON_THEME_COLOR),
        imageUrl: imageUrl ?? null,
        imageObjectKey: imageObjectKey ?? null,
      });
      setLocalPreviewUrl(null);
      return;
    }

    setFormData({
      key: "",
      name: "",
      about: "",
      themeColor: DEFAULT_PLATOON_THEME_COLOR,
      imageUrl: null,
      imageObjectKey: null,
    });
    setLocalPreviewUrl(null);
  }, [platoon]);

  const isEditMode = Boolean(platoon);
  const canUploadImage = useMemo(() => formData.key.trim().length > 0, [formData.key]);

  const handleChange = (field: keyof PlatoonFormData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (file: File) => {
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }

    const normalizedKey = formData.key.trim().toUpperCase();
    if (!normalizedKey) {
      setUploadError("Enter platoon key before uploading image.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const presign = await presignPlatoonImage({
        platoonKey: normalizedKey,
        contentType: file.type as "image/png" | "image/jpeg" | "image/webp",
        sizeBytes: file.size,
      });

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed.");
      }

      setFormData((prev) => ({
        ...prev,
        imageUrl: presign.publicUrl,
        imageObjectKey: presign.objectKey,
      }));
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      ...formData,
      key: formData.key.trim().toUpperCase(),
      name: formData.name.trim(),
      about: formData.about.trim(),
      themeColor: normalizePlatoonThemeColor(formData.themeColor),
    };

    onSubmit(normalized);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="key">Platoon Key</Label>
        <Input
          id="key"
          value={formData.key}
          onChange={(e) => handleChange("key", e.target.value.toUpperCase())}
          placeholder="Enter unique platoon key (e.g., KARNA)"
          disabled={isEditMode}
          required
        />
        {isEditMode && (
          <p className="text-xs text-muted-foreground">Key cannot be changed after creation</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Platoon Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter platoon name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="about">About</Label>
        <Textarea
          id="about"
          value={formData.about}
          onChange={(e) => handleChange("about", e.target.value)}
          placeholder="Enter platoon description"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-color">Theme Color</Label>
        <div className="flex items-center gap-2">
          <Input
            id="theme-color"
            type="color"
            value={normalizePlatoonThemeColor(formData.themeColor)}
            onChange={(e) => handleChange("themeColor", e.target.value.toUpperCase())}
            className="h-10 w-14 p-1"
          />
          <Input
            value={formData.themeColor}
            onChange={(e) => handleChange("themeColor", e.target.value.toUpperCase())}
            placeholder={DEFAULT_PLATOON_THEME_COLOR}
            maxLength={7}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Platoon Image</Label>
        <div className="overflow-hidden rounded-md border bg-muted/20">
          <div className="flex aspect-[16/9] max-h-56 w-full items-center justify-center">
            <SafeImage
              src={localPreviewUrl ?? formData.imageUrl}
              alt="Platoon"
              fallbackSrc="/images/commander-placeholder.jpg"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={!canUploadImage || uploading}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            await handleImageUpload(file);
            input.value = "";
          }}
        />
        {!canUploadImage && (
          <p className="text-xs text-muted-foreground">Enter platoon key first to enable image upload.</p>
        )}
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData((prev) => ({ ...prev, imageUrl: null, imageObjectKey: null }));
            setLocalPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
            setUploadError(null);
          }}
          disabled={uploading || !formData.imageUrl}
        >
          Remove Image
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading}>
          {isEditMode ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
