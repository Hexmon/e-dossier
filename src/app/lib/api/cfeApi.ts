import { api } from "@/app/lib/apiClient";

export type CfeItem = {
    cat: string;
    marks: number;
    remarks?: string;
};

export type CfeRecord = {
    id: string;
    semester: number;
    data: CfeItem[];
    remark?: string;
};

export const createCreditForExcellence = async (ocId: string, payload: { semester: number; data: CfeItem[]; remark?: string }[]) => {
    const res = await api.post<{ items: CfeRecord[]; count: number }>(`/api/v1/oc/${ocId}/credit-for-excellence`, payload);
    return res;
};

export const listCreditForExcellence = async (ocId: string) => {
    const res = await api.get<{ items: CfeRecord[]; count: number }>(`/api/v1/oc/${ocId}/credit-for-excellence`);
    return res;
};

export const updateCreditForExcellence = async (ocId: string, id: string, payload: { semester: number; data: CfeItem[]; remark?: string }) => {
    const res = await api.patch<{ data: CfeRecord }>(`/api/v1/oc/${ocId}/credit-for-excellence/${id}`, payload);
    return res;
};

export const deleteCreditForExcellence = async (ocId: string, id: string) => {
    const res = await api.delete(`/api/v1/oc/${ocId}/credit-for-excellence/${id}`);
    return res;
};

export const getCreditForExcellence = async (ocId: string, id: string) => {
    const res = await api.get<{ data: CfeRecord }>(`/api/v1/oc/${ocId}/credit-for-excellence/${id}`);
    return res;
};
