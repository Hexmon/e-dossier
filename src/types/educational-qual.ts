import { Qualification } from "./background-detls";
import { Cadet } from "./cadet";

interface Props {
  ocId: string;
  cadet: Cadet | null;
}

export type FormValues = {
    qualifications: Qualification[];
};
