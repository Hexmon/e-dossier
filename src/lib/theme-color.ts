export type ColorTone =
  | "primary"
  | "secondary"
  | "muted"
  | "success"
  | "warning"
  | "info"
  | "destructive";

export type ToneSurface = "icon" | "badge" | "text" | "subtle" | "button";

const TONE_SURFACE_CLASS_MAP: Record<ColorTone, Record<ToneSurface, string>> = {
  primary: {
    icon: "bg-primary text-primary-foreground",
    badge: "bg-primary text-primary-foreground",
    text: "text-primary",
    subtle: "bg-primary/10 text-primary border-primary/20",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  secondary: {
    icon: "bg-secondary text-secondary-foreground",
    badge: "bg-secondary text-secondary-foreground",
    text: "text-secondary-foreground",
    subtle: "bg-secondary text-secondary-foreground border-border",
    button: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
  muted: {
    icon: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    subtle: "bg-muted text-muted-foreground border-border",
    button: "bg-muted text-muted-foreground hover:bg-muted/80",
  },
  success: {
    icon: "bg-success text-success-foreground",
    badge: "bg-success text-success-foreground",
    text: "text-success",
    subtle: "bg-success/15 text-success border-success/30",
    button: "bg-success text-success-foreground hover:bg-success/90",
  },
  warning: {
    icon: "bg-warning text-warning-foreground",
    badge: "bg-warning text-warning-foreground",
    text: "text-warning",
    subtle: "bg-warning/20 text-warning-foreground border-warning/30",
    button: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  info: {
    icon: "bg-info text-info-foreground",
    badge: "bg-info text-info-foreground",
    text: "text-info",
    subtle: "bg-info/20 text-info border-info/30",
    button: "bg-info text-info-foreground hover:bg-info/90",
  },
  destructive: {
    icon: "bg-destructive text-destructive-foreground",
    badge: "bg-destructive text-destructive-foreground",
    text: "text-destructive",
    subtle: "bg-destructive/15 text-destructive border-destructive/30",
    button: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
};

export function resolveToneClasses(tone: ColorTone, surface: ToneSurface): string {
  return TONE_SURFACE_CLASS_MAP[tone][surface];
}

export function resolveStatusToneClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (["active", "success", "approved", "completed"].includes(normalized)) {
    return resolveToneClasses("success", "subtle");
  }
  if (["pending", "warning", "in-progress", "ongoing"].includes(normalized)) {
    return resolveToneClasses("warning", "subtle");
  }
  if (["error", "failed", "rejected", "inactive"].includes(normalized)) {
    return resolveToneClasses("destructive", "subtle");
  }
  return resolveToneClasses("muted", "subtle");
}

export function resolveTabStateClasses(isActive: boolean): string {
  return isActive
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-muted-foreground hover:bg-muted/80";
}

