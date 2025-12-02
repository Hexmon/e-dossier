import { FamilyMember } from "@/app/lib/api/familyApi";

export type Props = {
    ocId: string;
    cadet: {
        name?: string;
        ocId?: string;
        ocNumber?: string;
    } | null;
};

export type FormValues = {
    family: FamilyMember[];
};