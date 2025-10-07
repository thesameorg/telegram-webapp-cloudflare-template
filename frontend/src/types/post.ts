export interface ImageUrlData {
  originalUrl: string;
  thumbnailUrl: string;
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
