export interface ImageUrlData {
  id: number;
  imageKey: string;
  thumbnailKey: string;
  width: number;
  height: number;
  originalName: string;
  fileSize: number;
  uploadOrder: number;
}

export interface PostProfile {
  displayName?: string;
  bio?: string;
  profileImageKey?: string;
}

export interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  starCount?: number;
  commentCount?: number;
  paymentId?: string | null;
  isPaymentPending?: number;
  createdAt: string;
  updatedAt: string;
  images?: ImageUrlData[];
  profile?: PostProfile | null;
}
