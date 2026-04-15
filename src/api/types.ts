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
  /** 火灾状态：未处置/处置中/已扑灭（由后端存储与更新） */
  status?: FireStatus;
  /** 火灾等级：低/中/高（由后端存储与统计） */
  level?: FireLevel;
  /** 火情成因：人为/雷击/农事/未知（统计用） */
  cause?: FireCause;
  /** 行政区域/地点名称（用于台账与统计） */
  region?: string | null;
  /** 记录最后一次状态更新时间（台账用） */
  updated_at?: string;
  /** 标记火点的用户名（台账用） */
  reporter_username?: string | null;
  created_at: string;
};

export type FireMarkerListData = {
  items: FireMarkerItem[];
  total: number;
  page: number;
  page_size: number;
};

export type FireStatus = 'pending' | 'handling' | 'extinguished';
export type FireLevel = 'low' | 'medium' | 'high';
export type FireCause = 'human' | 'lightning' | 'farming' | 'unknown';

export type FireDashboardData = {
  overview: {
    today_reported: number;
    pending: number;
    handling: number;
    extinguished: number;
    level_counts: { low: number; medium: number; high: number };
  };
  cause_pie: Array<{ name: string; value: number }>;
  disposal_pie: Array<{ name: string; value: number }>;
  region_bar: Array<{ name: string; value: number }>;
  trend_30d: Array<{ date: string; value: number }>;
};

export type FireLedgerItem = {
  id: number;
  region: string;
  status: FireStatus;
  level: FireLevel;
  updated_at: string;
  reporter_username: string;
};

export type FireLedgerListData = {
  items: FireLedgerItem[];
  total: number;
  page: number;
  page_size: number;
};
