export interface Platoon {
  id: string;
  key: string;
  name: string;
  about: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlatoonFormData {
  key: string;
  name: string;
  about: string;
}