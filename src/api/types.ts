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
  /** 区县级行政区划名称（如「北京市密云区」），由后端逆地理写入；不按林场 */
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
  /** 关联火点，便于前端用火点上的 region/坐标补全台账展示 */
  marker_id?: number;
  /** 可选：事件发生时快照坐标（无 marker_id 或主表无 region 时用于逆地理） */
  longitude?: number;
  latitude?: number;
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

export type UavMissionType = 'uav' | 'fleet';

export type UavWaypoint = {
  longitude: number;
  latitude: number;
  /** 仅无人机任务需要；单位：米 */
  altitude?: number;
  /**
   * 后端/ROS 常用字段名：altitude_m（米）。
   * 为兼容不同实现，前端发送任务时会优先使用 altitude_m。
   */
  altitude_m?: number;
};

export type UavMissionStartBody = {
  mission_type: UavMissionType;
  waypoints: UavWaypoint[];
  /** 飞行速度挡位（由后端映射具体速度） */
  speed_level?: 'low' | 'medium' | 'high';
};

export type UavMissionStartData = {
  mission_id: string;
};

export type UavFlightStatus = 'flying' | 'hovering' | 'landed';

export type UavTelemetryPayload = {
  longitude: number;
  latitude: number;
  battery: number;
  speed: number;
  altitude: number;
  roll: number;
  pitch: number;
  status: UavFlightStatus;
  ts?: string;
};

/**
 * WS `uav.detection` 的 payload（与 ROS/后端一致）。
 * 前端在 `flame_count > 0` 且坐标有效等条件下 POST `/fire-markers` 并刷新火情台账。
 */
export type UavDetectionPayload = {
  fire_probability: number;
  risk_level: number;
  flame_count: number;
  average_confidence: number;
  detected_target_count: number;
  longitude: number;
  latitude: number;
  /** 后端兼容键：可直接用于 POST /fire-markers */
  fire_count?: number;
  /** 后端兼容键：可直接用于 POST /fire-markers */
  level?: FireLevel;
  /** 后端兼容键：可直接用于 POST /fire-markers */
  cause?: FireCause;
  fire_cause: FireCause;
  /** 后端生成的 ISO8601 UTC，可选；用于展示/排序，标点去抖仍用本地时间 */
  ts?: string;
};

export type FleetArrivedPayload = {
  arrived: boolean;
  ts?: string;
};
