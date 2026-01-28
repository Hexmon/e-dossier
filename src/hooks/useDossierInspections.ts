"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { api } from "@/app/lib/apiClient";
import { baseURL, endpoints } from "@/constants/endpoints";

export interface DossierInspection {
  id: string;
  date: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  inspector: {
    id: string;
    name: string;
    rank: string;
    appointment?: string;
  };
  initials: string;
}

export interface CreateInspectionData {
  inspectorUserId: string;
  date: Date;
  remarks?: string;
}

export interface UpdateInspectionData {
  inspectorUserId?: string;
  date?: Date;
  remarks?: string;
}

export function useDossierInspections(ocId?: string) {
  const [inspections, setInspections] = useState<DossierInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    if (!ocId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{
        message: string;
        inspections: DossierInspection[];
      }>(endpoints.oc.dossierInspections(ocId), { baseURL });

      setInspections(response.inspections);
    } catch (err) {
      setError("Failed to load dossier inspections");
      toast.error("Error loading dossier inspections");
    } finally {
      setLoading(false);
    }
  }, [ocId]);

  const createInspection = useCallback(async (data: CreateInspectionData) => {
    if (!ocId) return null;

    try {
      const response = await api.post<{
        message: string;
        inspection: DossierInspection;
      }, CreateInspectionData>(endpoints.oc.dossierInspections(ocId), data, { baseURL });

      setInspections(prev => [...prev, response.inspection]);
      toast.success("Inspection created successfully");
      return response.inspection;
    } catch (err) {
      toast.error("Failed to create inspection");
      return null;
    }
  }, [ocId]);

  const updateInspection = useCallback(async (inspectionId: string, data: UpdateInspectionData) => {
    if (!ocId) return false;

    try {
      const response = await api.patch<{
        message: string;
        inspection: DossierInspection;
      }, UpdateInspectionData>(
        `${endpoints.oc.dossierInspections(ocId)}?id=${inspectionId}`,
        data,
        { baseURL }
      );

      setInspections(prev =>
        prev.map(inspection =>
          inspection.id === inspectionId ? response.inspection : inspection
        )
      );
      toast.success("Inspection updated successfully");
      return true;
    } catch (err) {
      toast.error("Failed to update inspection");
      return false;
    }
  }, [ocId]);

  const deleteInspection = useCallback(async (inspectionId: string) => {
    if (!ocId) return false;

    try {
      await api.delete(
        `${endpoints.oc.dossierInspections(ocId)}?id=${inspectionId}`,
        { baseURL }
      );

      setInspections(prev => prev.filter(inspection => inspection.id !== inspectionId));
      toast.success("Inspection deleted successfully");
      return true;
    } catch (err) {
      toast.error("Failed to delete inspection");
      return false;
    }
  }, [ocId]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return {
    inspections,
    loading,
    error,
    createInspection,
    updateInspection,
    deleteInspection,
    refresh: fetchInspections,
  };
}
