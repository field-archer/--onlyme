export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export type AuthUser = {
  id: string;
  username: string;
};

export type LoginResponseData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type RegisterResponseData = {
  user: AuthUser;
};

export type FireMarkerItem = {
  id: number;
  longitude: number;
  latitude: number;
  marked_at: string;
  fire_count: number;
  source: string | null;
  note: string | null;
  created_at: string;
};

export type FireMarkerListData = {
  items: FireMarkerItem[];
  total: number;
  page: number;
  page_size: number;
};
