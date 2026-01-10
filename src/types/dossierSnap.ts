export interface OfficerCadetForm {
  arrivalPhoto: FileList | Blob | string | null;
  departurePhoto: FileList | Blob | string | null;
  tesNo: string;
  name: string;
  course: string;
  pi: string;
  dtOfArr: string;
  relegated: string;
  withdrawnOn: string;
  dtOfPassingOut: string;
  icNo: string;
  orderOfMerit: string;
  regtArm: string;
  postedAtt: string;
}
