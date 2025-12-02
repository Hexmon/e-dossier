"use client";

import * as React from "react";

// Minimal stubs to satisfy hooks that expect shadcn toast types.
export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

export type ToastActionElement = React.ReactElement;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const ToastViewport: React.FC = () => null;
export const Toast: React.FC<ToastProps> = () => null;
export const ToastClose: React.FC = () => null;

export const ToastAction: React.FC<
  React.ComponentProps<"button"> & { altText?: string }
> = (props) => <button {...props} />;
