import { Qualification } from "./background-detls";

export type Props = {
    ocId: string;
    cadet: {
        name?: string;
        ocId?: string;
        ocNumber?: string;
    } | null;
};

export type FormValues = {
    qualifications: Qualification[];
};
