export interface Platoon {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlatoonFormData {
  key: string;
  name: string;
  about: string;
  themeColor: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
}
