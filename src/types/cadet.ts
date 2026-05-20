export type Cadet = {
  name: string;
  course: string;
  courseName: string;
  ocNumber: string;
  ocId:string;
  branch?: "E" | "M" | "O" | null;
  currentSemester?: number | null;
  platoonId?: string | null;
  platoonKey?: string | null;
  platoonName?: string | null;
};
