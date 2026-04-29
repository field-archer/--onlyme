<template>
  <div class="uav-page">
    <header class="topbar">
      <div class="topbar-left">
        <div class="topbar-brand" aria-label="系统名称">
          <span class="topbar-brand-icon" aria-hidden="true">🚁</span>
          <div class="topbar-brand-text">
            <div class="topbar-title">无人机协同</div>
            <div class="topbar-subtitle">航线规划・状态回传・检测落库</div>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="topbar-time" aria-label="当前时间">{{ nowText }}</div>
        <div v-if="user" class="topbar-user">
          <div class="topbar-user-role">巡查员</div>
          <div class="topbar-user-name">{{ user.username }}</div>
        </div>
        <button class="topbar-btn" type="button" @click="goToMap">
          <span aria-hidden="true">🗺️</span>
          火情综合管理
        </button>
        <button v-if="user" class="topbar-btn danger" type="button" @click="logoutAndHome">
          退出
        </button>
      </div>
    </header>

    <main class="layout">
      <section class="col left">
        <div class="glass-card">
          <div class="glass-hd">
            <div class="glass-title">协同模块</div>
            <div class="glass-tag">{{ isMapLoaded ? '已加载' : '加载中…' }}</div>
          </div>
          <div class="glass-bd">
            <div class="mode-row" role="group" aria-label="协同任务模式">
              <button
                class="mode-btn"
                type="button"
                :class="{ active: mission.mode === 'uav' }"
                :disabled="!isMapLoaded || mission.isSending"
                @click="setMode('uav')"
              >
                🚁 无人机飞行
              </button>
              <button
                class="mode-btn"
                type="button"
                :class="{ active: mission.mode === 'fleet' }"
                :disabled="!isMapLoaded || mission.isSending"
                @click="setMode('fleet')"
              >
                🚒 车队前往
              </button>
            </div>

            <div class="muted-note">
              {{ mission.mode === 'uav' ? '无人机：依次采点并为每个点填写高度（米）。' : '车队：依次采点（不需要高度）。' }}
            </div>

            <section v-if="mission.mode === 'fleet'" class="fleet-panel" aria-label="车队前往模块">
              <div class="fleet-hd">
                <div class="fleet-title">车队前往</div>
              </div>

              <div class="fleet-line">
                <div class="fleet-k">车辆位置</div>
                <div class="fleet-v">
                  {{ car.pos ? `${car.pos.lng.toFixed(6)}, ${car.pos.lat.toFixed(6)}` : '等待定位…' }}
                </div>
              </div>

              <div class="fleet-subhd">目标点</div>
              <div class="fleet-inputs">
                <input
                  v-model="carTargetInput.longitude"
                  class="fleet-input"
                  inputmode="decimal"
                  placeholder="经度（如 116.397428）"
                  :disabled="mission.isSending"
                />
                <input
                  v-model="carTargetInput.latitude"
                  class="fleet-input"
                  inputmode="decimal"
                  placeholder="纬度（如 39.909230）"
                  :disabled="mission.isSending"
                />
              </div>
              <div class="fleet-actions">
                <button class="ghost-btn" type="button" :disabled="mission.isSending || !isMapLoaded" @click="togglePickCarTarget">
                  {{ car.pickingTarget ? '请点地图…' : '地图取点' }}
                </button>
                <button class="primary-btn" type="button" :disabled="mission.isSending" @click="dispatchCarByInput">
                  派发
                </button>
              </div>

              <div class="fleet-subhd">Home / 返航</div>
              <div class="fleet-line">
                <div class="fleet-k">Home</div>
                <div class="fleet-v">
                  {{ car.home ? `${car.home.lng.toFixed(6)}, ${car.home.lat.toFixed(6)}` : '未设置（默认首次定位）' }}
                </div>
              </div>
              <div class="fleet-actions">
                <button class="ghost-btn" type="button" :disabled="mission.isSending || !isMapLoaded" @click="startSetCarHome">
                  {{ car.uiSettingHome ? '请点地图…' : '地图设Home' }}
                </button>
                <button class="ghost-btn warn" type="button" :disabled="mission.isSending || !car.home" @click="carReturnToHome">
                  返航
                </button>
              </div>
            </section>

            <template v-if="mission.mode === 'uav'">
              <div class="action-row">
                <button
                  class="primary-btn"
                  type="button"
                  :disabled="!isMapLoaded || mission.isPlanning || mission.isSending"
                  @click="startPlanning"
                >
                  开始规划
                </button>
                <button
                  class="ghost-btn"
                  type="button"
                  :disabled="!isMapLoaded || (!mission.isPlanning && mission.waypoints.length === 0) || mission.isSending"
                  @click="resetPlanning"
                >
                  清空
                </button>
              </div>

              <div v-if="mission.isPlanning" class="planning-tip">
                <div class="planning-dot" aria-hidden="true"></div>
                <div class="planning-text">
                  规划中：点击地图采点，每个点会提示输入高度。
                </div>
              </div>

              <div class="manual-hd">
                <div class="manual-title">飞行设置</div>
                <div class="manual-tag">任务</div>
              </div>
              <div class="seg3" role="radiogroup" aria-label="无人机速度挡位">
              <button
                type="button"
                class="seg-btn"
                :class="{ active: planSettings.speedLevel === 'low' }"
                :disabled="mission.isSending"
                @click="planSettings.speedLevel = 'low'"
              >
                低速
              </button>
              <button
                type="button"
                class="seg-btn"
                :class="{ active: planSettings.speedLevel === 'medium' }"
                :disabled="mission.isSending"
                @click="planSettings.speedLevel = 'medium'"
              >
                中速
              </button>
              <button
                type="button"
                class="seg-btn"
                :class="{ active: planSettings.speedLevel === 'high' }"
                :disabled="mission.isSending"
                @click="planSettings.speedLevel = 'high'"
              >
                高速
              </button>
            </div>

              <div class="home-row">
                <div class="home-text">
                  Home：{{
                    homePos
                      ? `${homePos.lng.toFixed(6)}, ${homePos.lat.toFixed(6)}`
                      : '未设置（默认首次遥测位置）'
                  }}
                </div>
                <button class="ghost-btn" type="button" :disabled="mission.isSending || !isMapLoaded" @click="startSetHome">
                  {{ isSettingHome ? '请点地图…' : '地图设Home' }}
                </button>
                <button class="ghost-btn warn" type="button" :disabled="mission.isSending || !telemetry" @click="returnToHome">
                  返航
                </button>
              </div>

              <div class="scan-box">
              <label class="scan-row">
                <input v-model="planSettings.autoScanEnabled" type="checkbox" :disabled="mission.isSending" />
                <span>结束采点后自动生成覆盖扫描路径（正方形区域）</span>
              </label>
              <div class="scan-row">
                <span class="scan-lab">边长（m）</span>
                <input
                  v-model="planSettings.scanSizeM"
                  class="scan-input"
                  inputmode="numeric"
                  placeholder="200"
                  :disabled="mission.isSending"
                />
              </div>
              <div class="scan-row">
                <span class="scan-lab">扫描步长（m）</span>
                <input
                  v-model="planSettings.scanStepM"
                  class="scan-input"
                  inputmode="numeric"
                  placeholder="50"
                  :disabled="mission.isSending"
                />
                <button class="ghost-btn" type="button" :disabled="mission.isSending" @click="regenerateScanPath">
                  重新生成
                </button>
              </div>
              <div class="muted-note">说明：以“最终点”为中心生成覆盖航线，先上边界左→右，逐行向下扫描。</div>
            </div>

            <div class="manual-hd">
              <div class="manual-title">手动输入航点</div>
              <div class="manual-tag">可选</div>
            </div>

            <div class="manual-grid">
              <label class="field">
                <div class="field-lab">经度</div>
                <input
                  v-model="manualInput.longitude"
                  class="field-input"
                  inputmode="decimal"
                  placeholder="例如：116.397428"
                  :disabled="mission.isSending"
                />
              </label>
              <label class="field">
                <div class="field-lab">纬度</div>
                <input
                  v-model="manualInput.latitude"
                  class="field-input"
                  inputmode="decimal"
                  placeholder="例如：39.90923"
                  :disabled="mission.isSending"
                />
              </label>
              <label v-if="mission.mode === 'uav'" class="field span2">
                <div class="field-lab">高度（m）</div>
                <input
                  v-model="manualInput.altitude"
                  class="field-input"
                  inputmode="numeric"
                  placeholder="例如：120"
                  :disabled="mission.isSending"
                />
              </label>
            </div>
            <div class="manual-actions">
              <button class="ghost-btn" type="button" :disabled="mission.isSending" @click="addWaypointByInput">
                + 添加航点
              </button>
              <button class="ghost-btn" type="button" :disabled="mission.isSending" @click="fillFromMapCenter">
                从地图中心取值
              </button>
            </div>
            </template>

            <div class="wp-hd">
              <div class="wp-title">已采集航点</div>
              <div class="wp-tag">{{ mission.waypoints.length }}</div>
            </div>

            <div class="wp-list" role="list">
              <div v-if="mission.waypoints.length === 0" class="muted-note">暂无航点。点击“开始规划”后在地图上采点。</div>
              <div v-for="(w, idx) in mission.waypoints" :key="idx" class="wp-item" role="listitem">
                <div class="wp-idx">{{ idx + 1 }}</div>
                <div class="wp-main">
                  <div class="wp-coord">
                    {{ w.longitude.toFixed(6) }}, {{ w.latitude.toFixed(6) }}
                  </div>
                  <div v-if="idx === 0 && startWaypointLocked" class="wp-sub">
                    起点：无人机当前坐标（锁定）
                  </div>
                  <div v-if="mission.mode === 'uav'" class="wp-sub">
                    高度：{{ (w.altitude ?? 0).toFixed(0) }} m
                  </div>
                </div>
                <button
                  class="wp-del"
                  type="button"
                  :disabled="mission.isSending || (idx === 0 && startWaypointLocked)"
                  aria-label="删除该航点"
                  @click="removeWaypoint(idx)"
                >
                  ×
                </button>
              </div>
            </div>

            <div class="action-row">
              <button
                class="primary-btn go"
                type="button"
                :disabled="!isMapLoaded || mission.waypoints.length < 1 || mission.isPlanning || mission.isSending"
                @click="submitMission"
              >
                {{ mission.isSending ? '发送中…' : mission.mode === 'uav' ? '起飞' : '出发' }}
              </button>
              <button
                class="ghost-btn"
                type="button"
                :disabled="!isMapLoaded || !mission.isPlanning || mission.isSending"
                @click="stopPlanning"
              >
                结束采点
              </button>
            </div>

            <div v-if="mission.lastMissionId" class="muted-note">
              已下发任务：{{ mission.lastMissionId }}
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="glass-hd">
            <div class="glass-title">无人机状态</div>
            <div class="glass-tag">实时</div>
          </div>
          <div class="glass-bd">
            <div v-if="!telemetry" class="signal-wait">
              正在等待无人机遥测数据…
            </div>
            <div class="status-grid">
              <div class="status-pill">
                <div class="status-lab">电量</div>
                <div class="status-val">{{ telemetry ? `${telemetry.battery.toFixed(0)}%` : '—' }}</div>
              </div>
              <div class="status-pill">
                <div class="status-lab">速度</div>
                <div class="status-val">{{ telemetry ? `${telemetry.speed.toFixed(1)} m/s` : '—' }}</div>
              </div>
              <div class="status-pill">
                <div class="status-lab">高度</div>
                <div class="status-val">{{ telemetry ? `${telemetry.altitude.toFixed(0)} m` : '—' }}</div>
              </div>
            </div>
            <div class="status-row">
              <div class="muted-note">
                坐标：{{ telemetry ? `${telemetry.longitude.toFixed(6)}, ${telemetry.latitude.toFixed(6)}` : '—' }}
              </div>
              <div class="status-chip" :class="telemetry ? `st-${telemetry.status}` : 'st-none'">
                {{ telemetry ? flightStatusText(telemetry.status) : '未收到遥测' }}
              </div>
            </div>
            <div class="muted-note">ROLL：{{ telemetry ? `${telemetry.roll.toFixed(0)}°` : '—' }} / PITCH：{{ telemetry ? `${telemetry.pitch.toFixed(0)}°` : '—' }}</div>
            <div class="compass-wrap">
              <AttitudeCompass :roll="telemetry?.roll ?? 0" :pitch="telemetry?.pitch ?? 0" />
            </div>
          </div>
        </div>
      </section>

      <section class="col center">
        <div class="map-shell">
          <div class="map-head">
            <div v-if="mapSurfaceAlert || uavSurfaceHint" class="map-surface-alert" role="alert">
              {{ mapSurfaceAlert || uavSurfaceHint }}
            </div>
            <div class="map-head-right">
              <div class="map-status">
                <span class="dot" :class="{ ok: isMapLoaded, warn: !isMapLoaded }"></span>
                <span>{{ isMapLoaded ? '地图已就绪' : '地图加载中' }}</span>
              </div>
            </div>
          </div>
          <div class="map-body">
            <div ref="mapContainer" class="map-container"></div>
          </div>
        </div>
      </section>

      <section class="col right" @wheel.stop @touchmove.stop>
        <div class="glass-card">
          <div class="glass-hd">
            <div class="glass-title">检测结果</div>
            <div class="glass-tag">回传</div>
          </div>
          <div class="glass-bd">
            <div class="result-grid">
              <div class="result-pill">
                <div class="result-lab">火灾概率</div>
                <div class="result-val">{{ detection ? `${(detection.fire_probability * 100).toFixed(1)}%` : '—' }}</div>
              </div>
              <div class="result-pill">
                <div class="result-lab">风险等级</div>
                <div class="result-val">{{ detection ? detection.risk_level.toFixed(2) : '—' }}</div>
              </div>
              <div class="result-pill">
                <div class="result-lab">火焰数量</div>
                <div class="result-val">{{ detection ? detection.flame_count : '—' }}</div>
              </div>
              <div class="result-pill">
                <div class="result-lab">平均置信度</div>
                <div class="result-val">{{ detection ? `${(detection.average_confidence * 100).toFixed(1)}%` : '—' }}</div>
              </div>
              <div class="result-pill">
                <div class="result-lab">目标数量</div>
                <div class="result-val">{{ detection ? detection.detected_target_count : '—' }}</div>
              </div>
              <div class="result-pill">
                <div class="result-lab">火因</div>
                <div class="result-val">{{ detection ? causeText(detection.fire_cause) : '—' }}</div>
              </div>
            </div>
            <div class="muted-note">
              坐标：{{ detection ? `${detection.longitude.toFixed(6)}, ${detection.latitude.toFixed(6)}` : '—' }}
            </div>
          </div>
        </div>

        <div class="glass-card ledger">
          <div class="glass-hd">
            <div class="glass-title">火情处置台账</div>
            <div class="glass-tag">复用</div>
          </div>
          <div class="glass-bd">
            <FireLedgerPanel :items="ledgerItems" :total="ledgerTotal" :loading="ledgerLoading" :error="ledgerError" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMap } from '../composables/useMap';
import { fetchGeoMapConfig } from '../api/geo';
import { useAuth } from '../composables/useAuth';
import { startUavMission } from '../api/uav';
import type {
  FleetArrivedPayload,
  FireCause,
  FireLedgerItem,
  FireLevel,
  FireMarkerItem,
  UavDetectionPayload,
  UavMissionType,
  UavTelemetryPayload,
  UavWaypoint
} from '../api/types';
import { buildWsUrl } from '../utils/ws';
import AttitudeCompass from '../components/AttitudeCompass.vue';
import { createFireMarker, listFireMarkers } from '../api/fireMarkers';
import { listFireLedger } from '../api/fireLedger';
import FireLedgerPanel from '../components/FireLedgerPanel.vue';
import { markersToIdMap, mergeLedgerWithPendingMarkers, enrichLedgerItems } from '../utils/regionEnrichment';

const router = useRouter();

const { token, user, logout } = useAuth();

const now = ref<Date>(new Date());
let clockTimer: number | null = null;
const nowText = computed(() => {
  const d = now.value;
  const pad = (n: number) => String(n).padStart(2, '0');
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  星期${week}  ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

const mapContainer = ref<HTMLElement | null>(null);
const mapGeoHint = ref('');

const { map, isMapLoaded, mapInitError, initMap } = useMap(mapContainer, {
  fetchMapCredentials: async () => {
    const t = token.value;
    if (t) {
      const d = await fetchGeoMapConfig(t);
      const jsapiKey = (d.jsapi_key || '').trim();
      const securityJsCode = (d.security_js_code || '').trim();
      if (!jsapiKey) {
        throw new Error('服务端 map-config 未返回 jsapi_key，请在服务端配置高德「Web端(JS API)」Key。');
      }
      return { jsapiKey, securityJsCode };
    }
    const k = (import.meta.env.VITE_AMAP_KEY || '').trim();
    const s = (import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim();
    if (k && s) return { jsapiKey: k, securityJsCode: s };
    throw new Error('请先登录以加载地图；未登录时可在本地 .env 配置 VITE_AMAP_KEY 与 VITE_AMAP_SECURITY_CODE 供调试。');
  }
});

const mapSurfaceAlert = computed(() => mapInitError.value || mapGeoHint.value);

const mission = reactive<{
  mode: UavMissionType;
  isPlanning: boolean;
  isSending: boolean;
  waypoints: UavWaypoint[];
  lastMissionId: string;
}>({
  mode: 'uav',
  isPlanning: false,
  isSending: false,
  waypoints: [],
  lastMissionId: ''
});

const planSettings = reactive<{
  speedLevel: 'low' | 'medium' | 'high';
  autoScanEnabled: boolean;
  scanStepM: string;
  scanSizeM: string;
}>({
  speedLevel: 'medium',
  autoScanEnabled: true,
  scanStepM: '50',
  scanSizeM: '200'
});

const startWaypointLocked = ref(false);
const scanMeta = reactive<{ generated: boolean; startIndex: number }>({ generated: false, startIndex: -1 });
const scanCenter = ref<{ lng: number; lat: number; altitude: number } | null>(null);

let routeLine: any | null = null;
let clickHandler: ((e: any) => void) | null = null;

const manualInput = reactive<{ longitude: string; latitude: string; altitude: string }>({
  longitude: '',
  latitude: '',
  altitude: ''
});

const telemetry = ref<UavTelemetryPayload | null>(null);
const detection = ref<UavDetectionPayload | null>(null);
const fleetArrived = ref<FleetArrivedPayload | null>(null);
const hasUavSignal = computed(() => Boolean(telemetry.value));
const uavSurfaceHint = computed(() => (hasUavSignal.value ? '' : '正在等待无人机遥测数据…'));

const homePos = ref<{ lng: number; lat: number } | null>(null);
const isSettingHome = ref(false);
let setHomeClickHandler: ((e: any) => void) | null = null;

let ws: WebSocket | null = null;
let uavMarker: any | null = null;
let homeMarker: any | null = null;
let carMarker: any | null = null;
let carHomeMarker: any | null = null;
let lastDetectionMarkerAt: { longitude: number; latitude: number; ts: number } | null = null;
let flightLineBase: any | null = null;
let flightLineFlow: any | null = null;
let flightDashOffset = 0;
let flightDashTimer: number | null = null;
let displayedPos: { lng: number; lat: number } | null = null;
let targetPos: { lng: number; lat: number; ts: number } | null = null;
let animRaf: number | null = null;
let hasFocusedOnUav = false;
let returningHome = false;
let returningHomeTarget: { lng: number; lat: number } | null = null;
let carReturningHome = false;
let carReturningHomeTarget: { lng: number; lat: number } | null = null;

let returnPlanLine: any | null = null;
let returnPlanMarkers: any[] = [];
const MAX_FLIGHT_TRAIL_POINTS = 80;
const MAX_CAR_TRAIL_POINTS = 80;

let carPlanLine: any | null = null;
let carTrailBase: any | null = null;
let carTrailFlow: any | null = null;
let carDashOffset = 0;
let carDashTimer: number | null = null;
let carDisplayedPos: { lng: number; lat: number } | null = null;
let carTargetPos: { lng: number; lat: number; ts: number } | null = null;
let carAnimRaf: number | null = null;

const car = reactive<{
  pos: { lng: number; lat: number } | null;
  home: { lng: number; lat: number } | null;
  uiSettingPos: boolean;
  uiSettingHome: boolean;
  pickingTarget: boolean;
}>({
  pos: null,
  home: null,
  uiSettingPos: false,
  uiSettingHome: false,
  pickingTarget: false
});

let carSetPosHandler: ((e: any) => void) | null = null;
let carSetHomeHandler: ((e: any) => void) | null = null;
let carPickTargetHandler: ((e: any) => void) | null = null;

const carTargetInput = reactive<{ longitude: string; latitude: string }>({ longitude: '', latitude: '' });

const lastFireMarkers = ref<FireMarkerItem[]>([]);
const ledgerItems = ref<FireLedgerItem[]>([]);
const ledgerTotal = ref(0);
const ledgerLoading = ref(false);
const ledgerError = ref('');

function logoutAndHome() {
  logout();
  router.push('/');
}

function goToMap() {
  router.push('/map');
}

function setMode(m: UavMissionType) {
  if (mission.isPlanning) {
    resetPlanning();
  }
  mission.mode = m;
}

function clearGeneratedScanPath() {
  if (!scanMeta.generated) return;
  if (scanMeta.startIndex >= 0) {
    mission.waypoints = mission.waypoints.slice(0, scanMeta.startIndex);
  }
  scanMeta.generated = false;
  scanMeta.startIndex = -1;
}

function ensureStartWaypoint(): boolean {
  if (mission.waypoints.length > 0) return true;
  const t = telemetry.value;
  if (!t) {
    alert('尚未收到无人机遥测数据，无法锁定起点坐标。请稍等片刻。');
    return false;
  }
  const alt = Number.isFinite(Number(t.altitude)) && Number(t.altitude) > 0 ? Number(t.altitude) : 15;
  mission.waypoints.push({ longitude: Number(t.longitude), latitude: Number(t.latitude), altitude: alt });
  startWaypointLocked.value = true;
  return true;
}

function updateScanCenterFromLastUserPoint() {
  if (mission.waypoints.length === 0) return;
  // 用户最后一次标记的点：生成扫描线前，清掉扫描追加的点，取最后一个
  clearGeneratedScanPath();
  const last = mission.waypoints[mission.waypoints.length - 1];
  const alt = Number(last.altitude) > 0 ? Number(last.altitude) : 15;
  scanCenter.value = { lng: last.longitude, lat: last.latitude, altitude: alt };
}

function startPlanning() {
  if (!map.value) return;
  if (mission.isPlanning) return;
  if (mission.mode === 'uav') {
    // 起点固定为无人机当前坐标
    if (!ensureStartWaypoint()) return;
  }
  mission.isPlanning = true;
  mission.lastMissionId = '';
  clearGeneratedScanPath();

  clickHandler = async (e: any) => {
    if (!mission.isPlanning) return;
    const AMap = (window as any).AMap;
    if (!AMap) return;
    const lng = Number(e?.lnglat?.getLng?.() ?? e?.lnglat?.lng);
    const lat = Number(e?.lnglat?.getLat?.() ?? e?.lnglat?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    if (mission.mode === 'uav') {
      if (!ensureStartWaypoint()) return;
    }

    const wp: UavWaypoint = { longitude: lng, latitude: lat };
    if (mission.mode === 'uav') {
      const raw = prompt('请输入该航点高度（米）。', '120');
      if (raw == null) return; // user cancelled
      const alt = Number(raw);
      if (!Number.isFinite(alt) || alt <= 0) {
        alert('高度需为正数（单位：米）。');
        return;
      }
      wp.altitude = alt;
    }

    mission.waypoints.push(wp);
    scanCenter.value = { lng: wp.longitude, lat: wp.latitude, altitude: Number(wp.altitude) > 0 ? Number(wp.altitude) : 15 };
    drawRouteLine();
  };

  map.value.on('click', clickHandler);
}

function stopPlanning() {
  if (!map.value) return;
  if (!mission.isPlanning) return;
  mission.isPlanning = false;
  if (clickHandler) {
    map.value.off('click', clickHandler);
    clickHandler = null;
  }

  if (mission.mode === 'uav' && planSettings.autoScanEnabled) {
    regenerateScanPath();
  }
}

function resetPlanning() {
  stopPlanning();
  mission.waypoints = [];
  mission.lastMissionId = '';
  startWaypointLocked.value = false;
  clearGeneratedScanPath();
  scanCenter.value = null;
  clearRouteLine();
}

function removeWaypoint(idx: number) {
  if (idx === 0 && startWaypointLocked.value) return;
  clearGeneratedScanPath();
  mission.waypoints.splice(idx, 1);
  scanCenter.value = null;
  drawRouteLine();
}

function parseNumber(raw: string) {
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function addWaypointByInput() {
  const lng = parseNumber(manualInput.longitude);
  const lat = parseNumber(manualInput.latitude);
  if (lng == null || lat == null) {
    alert('请输入有效的经纬度数字。');
    return;
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    alert('经纬度范围不合法（经度 -180~180，纬度 -90~90）。');
    return;
  }

  if (mission.mode === 'uav') {
    if (!ensureStartWaypoint()) return;
  }

  const wp: UavWaypoint = { longitude: lng, latitude: lat };
  if (mission.mode === 'uav') {
    const alt = parseNumber(manualInput.altitude);
    if (alt == null || alt <= 0) {
      alert('无人机航点高度需为正数（米）。');
      return;
    }
    wp.altitude = alt;
  }

  clearGeneratedScanPath();
  mission.waypoints.push(wp);
  scanCenter.value = { lng: wp.longitude, lat: wp.latitude, altitude: Number(wp.altitude) > 0 ? Number(wp.altitude) : 15 };
  drawRouteLine();
}

function fillFromMapCenter() {
  if (!map.value) return;
  const c = map.value.getCenter?.();
  const lng = Number(c?.getLng?.() ?? c?.lng);
  const lat = Number(c?.getLat?.() ?? c?.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  manualInput.longitude = String(lng.toFixed(6));
  manualInput.latitude = String(lat.toFixed(6));
}

function clearReturnPlan() {
  try {
    returnPlanLine?.remove?.();
  } catch {
    /* ignore */
  }
  returnPlanLine = null;
  for (const m of returnPlanMarkers) {
    try {
      m?.remove?.();
    } catch {
      /* ignore */
    }
  }
  returnPlanMarkers = [];
}

function clearFlightTrail() {
  try {
    flightLineBase?.setPath?.([]);
    flightLineFlow?.setPath?.([]);
  } catch {
    /* ignore */
  }
}

function clearAllTrajectories() {
  clearRouteLine();
  clearReturnPlan();
  clearFlightTrail();
}

function buildReturnWaypoints(current: { lng: number; lat: number }, home: { lng: number; lat: number }) {
  const pts: Array<{ lng: number; lat: number }> = [];
  const n = 5; // 固定 5 个标记点（含起止）
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({
      lng: current.lng + (home.lng - current.lng) * t,
      lat: current.lat + (home.lat - current.lat) * t
    });
  }
  return pts;
}

async function returnToHome() {
  const tkn = token.value;
  if (!tkn) {
    alert('请先登录');
    router.push('/login');
    return;
  }
  const t = telemetry.value;
  if (!t) {
    alert('尚未收到无人机遥测数据，无法返航。');
    return;
  }
  if (!homePos.value) {
    homePos.value = { lng: Number(t.longitude), lat: Number(t.latitude) };
  }
  const home = homePos.value;
  if (!home) return;

  const current = { lng: Number(t.longitude), lat: Number(t.latitude) };
  const pts = buildReturnWaypoints(current, home);
  const alt = Number.isFinite(Number(t.altitude)) && Number(t.altitude) > 0 ? Number(t.altitude) : 15;

  // 地图上显示返航规划：5 个点 + 规划线
  if (map.value) {
    const AMap = (window as any).AMap;
    if (AMap) {
      clearReturnPlan();
      returnPlanLine = new AMap.Polyline({
        path: pts.map((p) => [p.lng, p.lat]),
        strokeColor: 'rgba(255, 176, 32, 0.90)',
        strokeWeight: 5,
        strokeOpacity: 0.95,
        strokeStyle: 'dashed',
        strokeDasharray: [10, 8],
        zIndex: 170
      });
      returnPlanLine.setMap(map.value);
      returnPlanMarkers = pts.map((p, idx) => {
        const isEnd = idx === pts.length - 1;
        return new AMap.Marker({
          position: [p.lng, p.lat],
          map: map.value,
          zIndex: 175,
          offset: new AMap.Pixel(-8, -8),
          content:
            `<div class="ret-dot ${isEnd ? 'end' : ''}">` +
            `<span>${idx + 1}</span>` +
            `</div>`
        });
      });
    }
  }

  if (!confirm('确认执行返航？将生成 5 个航点直线飞回 Home。')) return;

  mission.isSending = true;
  try {
    const res = await startUavMission(tkn, {
      mission_type: 'uav',
      speed_level: planSettings.speedLevel,
      waypoints: pts.map((p) => ({ longitude: p.lng, latitude: p.lat, altitude_m: alt, altitude: alt }))
    });
    mission.lastMissionId = res.mission_id;
    // 返航任务下发成功：等待到达 Home 后再清除轨迹
    returningHome = true;
    returningHomeTarget = { ...home };
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '返航任务下发失败');
  } finally {
    mission.isSending = false;
  }
}

function clearRouteLine() {
  try {
    routeLine?.remove?.();
  } catch {
    /* ignore */
  }
  routeLine = null;
}

function metersToDeltaLat(m: number) {
  return m / 111320;
}

function metersToDeltaLng(m: number, lat: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  return m / (111320 * (cos || 1));
}

function generateScanWaypoints(center: { lng: number; lat: number }, sizeM = 200, stepM = 50) {
  const half = sizeM / 2;
  const dLatHalf = metersToDeltaLat(half);
  const dLngHalf = metersToDeltaLng(half, center.lat);
  const dLatStep = metersToDeltaLat(stepM);

  const top = center.lat + dLatHalf;
  const bottom = center.lat - dLatHalf;
  const left = center.lng - dLngHalf;
  const right = center.lng + dLngHalf;

  const out: UavWaypoint[] = [];
  let row = 0;
  for (let y = top; y >= bottom - 1e-12; y -= dLatStep) {
    const lat = Math.max(bottom, y);
    const goRight = row % 2 === 0;
    out.push({ longitude: goRight ? left : right, latitude: lat });
    out.push({ longitude: goRight ? right : left, latitude: lat });
    row++;
    if (lat <= bottom + 1e-12) break;
  }
  return out;
}

function regenerateScanPath() {
  if (mission.mode !== 'uav') return;
  if (!planSettings.autoScanEnabled) return;
  if (mission.waypoints.length < 1) return;

  updateScanCenterFromLastUserPoint();
  const center = scanCenter.value;
  if (!center) return;

  const step = parseNumber(planSettings.scanStepM);
  const stepM = step != null && step >= 10 && step <= 200 ? Math.floor(step) : 50;
  planSettings.scanStepM = String(stepM);

  const size = parseNumber(planSettings.scanSizeM);
  const sizeM = size != null && size >= 50 && size <= 2000 ? Math.floor(size) : 200;
  planSettings.scanSizeM = String(sizeM);

  clearGeneratedScanPath();

  scanMeta.startIndex = mission.waypoints.length;
  const scan = generateScanWaypoints({ lng: center.lng, lat: center.lat }, sizeM, stepM);
  // 补高度：沿用用户最后一次标记点高度（或默认 15）
  const baseAlt = center.altitude;
  for (const w of scan) {
    w.altitude = baseAlt;
  }
  mission.waypoints.push(...scan);
  scanMeta.generated = true;
  drawRouteLine();
}

function startSetHome() {
  if (!map.value) return;
  if (isSettingHome.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  isSettingHome.value = true;
  setHomeClickHandler = (e: any) => {
    const lng = Number(e?.lnglat?.getLng?.() ?? e?.lnglat?.lng);
    const lat = Number(e?.lnglat?.getLat?.() ?? e?.lnglat?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    homePos.value = { lng, lat };
    updateHomeMarker(lng, lat);
    stopSetHome();
    alert('已设置 Home。');
  };
  map.value.on('click', setHomeClickHandler);
}

function stopSetHome() {
  if (!map.value) return;
  if (!isSettingHome.value) return;
  if (setHomeClickHandler) {
    map.value.off('click', setHomeClickHandler);
    setHomeClickHandler = null;
  }
  isSettingHome.value = false;
}

function ensureCarMarker() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (carMarker) return;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
    '  <defs>' +
    '    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">' +
    '      <feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="rgba(255,176,32,0.85)"/>' +
    '      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="rgba(255,176,32,0.25)"/>' +
    '    </filter>' +
    '  </defs>' +
    '  <g filter="url(#glow)">' +
    '    <path d="M12 38h40l-4.5-14H16.5L12 38Z" fill="rgba(255,176,32,0.40)" stroke="rgba(255,176,32,1)" stroke-width="3.2" stroke-linejoin="round"/>' +
    '    <path d="M20 26h24" stroke="rgba(255,255,255,0.92)" stroke-width="2.6" stroke-linecap="round"/>' +
    '    <path d="M18 38h28" stroke="rgba(6,14,22,0.35)" stroke-width="2" stroke-linecap="round"/>' +
    '    <circle cx="22" cy="44" r="4.6" fill="rgba(6,14,22,0.65)" stroke="rgba(255,255,255,0.9)" stroke-width="2.4"/>' +
    '    <circle cx="42" cy="44" r="4.6" fill="rgba(6,14,22,0.65)" stroke="rgba(255,255,255,0.9)" stroke-width="2.4"/>' +
    '  </g>' +
    '</svg>';
  const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  carMarker = new AMap.Marker({
    position: [116.397428, 39.90923],
    map: map.value,
    anchor: 'center',
    offset: new AMap.Pixel(0, 0),
    zIndex: 195,
    title: '车辆',
    icon: new AMap.Icon({
      size: new AMap.Size(44, 44),
      image: iconUrl,
      imageSize: new AMap.Size(44, 44)
    })
  });
}

function updateCarMarker(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureCarMarker();
  // 平滑移动：遥测点设为目标点，由 rAF 推进
  carTargetPos = { lng, lat, ts: Date.now() };
  if (!carDisplayedPos) carDisplayedPos = { lng, lat };
  if (carAnimRaf == null) {
    const step = () => {
      if (!map.value || !carMarker || !carDisplayedPos || !carTargetPos) {
        carAnimRaf = null;
        return;
      }
      const AMap2 = (window as any).AMap;
      if (!AMap2) {
        carAnimRaf = null;
        return;
      }
      const dt = Date.now() - carTargetPos.ts;
      const duration = 420;
      const t = Math.min(1, dt / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      carDisplayedPos.lng = carDisplayedPos.lng + (carTargetPos.lng - carDisplayedPos.lng) * ease;
      carDisplayedPos.lat = carDisplayedPos.lat + (carTargetPos.lat - carDisplayedPos.lat) * ease;
      carMarker.setPosition(new AMap2.LngLat(carDisplayedPos.lng, carDisplayedPos.lat));
      updateCarTrail(carDisplayedPos.lng, carDisplayedPos.lat);
      // 车辆返航到达判定：距离 Home 足够近后清除车轨迹
      if (carReturningHome && carReturningHomeTarget) {
        const d = haversineMeters(
          { lng: carDisplayedPos.lng, lat: carDisplayedPos.lat },
          carReturningHomeTarget
        );
        if (d <= 15) {
          carReturningHome = false;
          carReturningHomeTarget = null;
          clearCarPlanLine();
          clearCarTrail();
        }
      }
      if (t < 1) {
        carAnimRaf = requestAnimationFrame(step);
      } else {
        carAnimRaf = null;
        carDisplayedPos = { lng: carTargetPos.lng, lat: carTargetPos.lat };
      }
    };
    carAnimRaf = requestAnimationFrame(step);
  }
}

function clearCarPlanLine() {
  try {
    carPlanLine?.remove?.();
  } catch {
    /* ignore */
  }
  carPlanLine = null;
}

function drawCarPlanLine(target: { lng: number; lat: number }) {
  if (!map.value) return;
  if (!car.pos) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  clearCarPlanLine();
  carPlanLine = new AMap.Polyline({
    path: [
      [car.pos.lng, car.pos.lat],
      [target.lng, target.lat]
    ],
    strokeColor: 'rgba(255, 176, 32, 0.92)',
    strokeWeight: 5,
    strokeOpacity: 0.95,
    strokeStyle: 'dashed',
    strokeDasharray: [12, 10],
    lineJoin: 'round',
    zIndex: 150
  });
  carPlanLine.setMap(map.value);
}

function ensureCarTrail() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (carTrailBase && carTrailFlow) return;
  carTrailBase = new AMap.Polyline({
    path: [],
    strokeColor: 'rgba(0, 132, 255, 0.95)',
    strokeWeight: 10,
    strokeOpacity: 0.90,
    strokeStyle: 'solid',
    lineJoin: 'round',
    zIndex: 140,
    outlineColor: 'rgba(0,0,0,0.18)',
    outlineWeight: 2
  });
  carTrailBase.setMap(map.value);
  carTrailFlow = new AMap.Polyline({
    path: [],
    strokeColor: 'rgba(255, 255, 255, 0.90)',
    strokeWeight: 4,
    strokeOpacity: 0.90,
    strokeStyle: 'dashed',
    strokeDasharray: [16, 14],
    showDir: true,
    lineJoin: 'round',
    zIndex: 145
  });
  carTrailFlow.setMap(map.value);
  if (carDashTimer == null) {
    carDashTimer = window.setInterval(() => {
      carDashOffset = (carDashOffset + 4) % 2000;
      try {
        carTrailFlow?.setOptions?.({ strokeDashoffset: carDashOffset });
      } catch {
        /* ignore */
      }
    }, 60);
  }
}

function updateCarTrail(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureCarTrail();
  if (!carTrailBase || !carTrailFlow) return;
  const path = carTrailBase.getPath?.() || [];
  path.push(new AMap.LngLat(lng, lat));
  const sliced = path.length > MAX_CAR_TRAIL_POINTS ? path.slice(path.length - MAX_CAR_TRAIL_POINTS) : path;
  carTrailBase.setPath(sliced);
  carTrailFlow.setPath(sliced);
}

function clearCarTrail() {
  try {
    carTrailBase?.setPath?.([]);
    carTrailFlow?.setPath?.([]);
  } catch {
    /* ignore */
  }
}

function stopCarPickers() {
  if (!map.value) return;
  if (carSetPosHandler) {
    map.value.off('click', carSetPosHandler);
    carSetPosHandler = null;
  }
  if (carSetHomeHandler) {
    map.value.off('click', carSetHomeHandler);
    carSetHomeHandler = null;
  }
  if (carPickTargetHandler) {
    map.value.off('click', carPickTargetHandler);
    carPickTargetHandler = null;
  }
  car.uiSettingPos = false;
  car.uiSettingHome = false;
  car.pickingTarget = false;
}

function startSetCarHome() {
  if (!map.value) return;
  stopCarPickers();
  car.uiSettingHome = true;
  carSetHomeHandler = (e: any) => {
    const lng = Number(e?.lnglat?.getLng?.() ?? e?.lnglat?.lng);
    const lat = Number(e?.lnglat?.getLat?.() ?? e?.lnglat?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    car.home = { lng, lat };
    updateCarHomeMarker(lng, lat);
    stopCarPickers();
  };
  map.value.on('click', carSetHomeHandler);
}

function togglePickCarTarget() {
  if (!map.value) return;
  if (!isMapLoaded.value) return;
  stopCarPickers();
  car.pickingTarget = true;
  carPickTargetHandler = (e: any) => {
    const lng = Number(e?.lnglat?.getLng?.() ?? e?.lnglat?.lng);
    const lat = Number(e?.lnglat?.getLat?.() ?? e?.lnglat?.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    carTargetInput.longitude = String(lng.toFixed(6));
    carTargetInput.latitude = String(lat.toFixed(6));
    if (car.pos) {
      drawCarPlanLine({ lng, lat });
    }
    stopCarPickers();
  };
  map.value.on('click', carPickTargetHandler);
}

function fillCarTargetFromMapCenter() {
  if (!map.value) return;
  const c = map.value.getCenter?.();
  const lng = Number(c?.getLng?.() ?? c?.lng);
  const lat = Number(c?.getLat?.() ?? c?.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  carTargetInput.longitude = String(lng.toFixed(6));
  carTargetInput.latitude = String(lat.toFixed(6));
}

function dispatchCarByInput() {
  const lng = parseNumber(carTargetInput.longitude);
  const lat = parseNumber(carTargetInput.latitude);
  if (lng == null || lat == null) {
    alert('请输入有效的目标经纬度数字。');
    return;
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    alert('目标经纬度范围不合法（经度 -180~180，纬度 -90~90）。');
    return;
  }
  if (car.pos) {
    drawCarPlanLine({ lng, lat });
  }
  void carDispatchToTarget({ lng, lat });
}

async function carDispatchToTarget(target: { lng: number; lat: number }) {
  const tkn = token.value;
  if (!tkn) {
    alert('请先登录');
    router.push('/login');
    return;
  }
  mission.isSending = true;
  try {
    const res = await startUavMission(tkn, {
      mission_type: 'fleet',
      speed_level: planSettings.speedLevel,
      waypoints: [{ longitude: target.lng, latitude: target.lat }]
    });
    mission.lastMissionId = res.mission_id;
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '车队任务下发失败');
  } finally {
    mission.isSending = false;
  }
}

async function carReturnToHome() {
  if (!car.home) {
    alert('请先设置车 Home');
    return;
  }
  if (!confirm('确认车辆返航到 Home？')) return;
  // 返航任务下发成功：等待到达 Home 后清除车轨迹
  carReturningHome = true;
  carReturningHomeTarget = { ...car.home };
  await carDispatchToTarget(car.home);
}
function drawRouteLine() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;

  clearRouteLine();

  if (mission.waypoints.length < 2) return;
  const path = mission.waypoints.map((w) => [w.longitude, w.latitude]);
  routeLine = new AMap.Polyline({
    path,
    strokeColor: 'rgba(0, 255, 168, 0.85)',
    strokeWeight: 5,
    strokeOpacity: 0.9,
    showDir: true,
    lineJoin: 'round',
    zIndex: 130
  });
  routeLine.setMap(map.value);
}

async function submitMission() {
  const t = token.value;
  if (!t) {
    alert('请先登录');
    router.push('/login');
    return;
  }
  if (mission.waypoints.length < 1) {
    alert('至少采集 1 个航点后再下发任务。');
    return;
  }
  if (mission.mode === 'uav') {
    const missing = mission.waypoints.some((w) => !w.altitude || w.altitude <= 0);
    if (missing) {
      alert('无人机任务每个航点都必须填写高度（米）。');
      return;
    }
  }

  mission.isSending = true;
  try {
    // 车队：只取一个“目标点”（最后一个点）
    if (mission.mode === 'fleet') {
      const last = mission.waypoints[mission.waypoints.length - 1];
      const res = await startUavMission(t, {
        mission_type: 'fleet',
        speed_level: planSettings.speedLevel,
        waypoints: [{ longitude: last.longitude, latitude: last.latitude }]
      });
      mission.lastMissionId = res.mission_id;
      stopPlanning();
      return;
    }
    const res = await startUavMission(t, {
      mission_type: mission.mode,
      speed_level: planSettings.speedLevel,
      waypoints: mission.waypoints.map((w) =>
        mission.mode === 'uav'
          ? {
              longitude: w.longitude,
              latitude: w.latitude,
              // 兼容后端/ROS 字段命名：优先 altitude_m
              altitude_m: w.altitude,
              altitude: w.altitude
            }
          : { longitude: w.longitude, latitude: w.latitude }
      )
    });
    mission.lastMissionId = res.mission_id;
    stopPlanning();
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '任务下发失败');
  } finally {
    mission.isSending = false;
  }
}

function flightStatusText(s: UavTelemetryPayload['status']) {
  if (s === 'flying') return '飞行';
  if (s === 'hovering') return '悬停';
  return '落地';
}

function causeText(c: UavDetectionPayload['fire_cause']) {
  if (c === 'human') return '人为';
  if (c === 'lightning') return '雷击';
  if (c === 'farming') return '农事';
  return '未知';
}

const FIRE_CAUSES: readonly FireCause[] = ['human', 'lightning', 'farming', 'unknown'];

/** ROS/后端可能传大小写或异常字符串，落库前收敛为合法 fire_cause */
function normalizeRosFireCause(raw: unknown): FireCause {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  return (FIRE_CAUSES as readonly string[]).includes(s) ? (s as FireCause) : 'unknown';
}

function normalizeDetectionLevel(rawLevel: unknown, fallbackRiskLevel: unknown): FireLevel {
  const s = String(rawLevel ?? '')
    .trim()
    .toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high') return s as FireLevel;
  return riskToLevel(Number(fallbackRiskLevel));
}

function normalizeDetectionFireCount(d: UavDetectionPayload): number {
  const n = Math.floor(
    Number(
      d.fire_count ??
      d.flame_count ??
      d.detected_target_count ??
      0
    )
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function riskToLevel(riskLevel: number): FireLevel {
  // 复用 MainView 的“火焰数量->等级”口径：这里用 risk_level 数值粗分，避免后端实现不一致时前端还能画出三档
  // 约定：risk_level >= 0.67 -> high, >= 0.34 -> medium, else low
  const r = Number(riskLevel);
  if (!Number.isFinite(r)) return 'low';
  if (r >= 0.67) return 'high';
  if (r >= 0.34) return 'medium';
  return 'low';
}

/**
 * 收到 WS `{ type: 'uav.detection', payload }` 后执行：
 * 1) 条件满足时 POST `/api/fire-markers` 创建火点；
 * 2) await `refreshLedger()` 更新火情处置台账（含 listFireMarkers + listFireLedger 合并）。
 * 不在遥测/航线等其它路径写火点。
 */
async function persistFireMarkerFromDetection(d: UavDetectionPayload) {
  const t = token.value;
  if (!t) return;
  if (!map.value) return;

  const lng = Number(d.longitude);
  const lat = Number(d.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

  const flames = normalizeDetectionFireCount(d);
  if (!Number.isFinite(flames) || flames <= 0) return;

  // 简单去抖：同一坐标附近 20m、10s 内不重复标点
  const nowTs = Date.now();
  if (lastDetectionMarkerAt) {
    const dt = nowTs - lastDetectionMarkerAt.ts;
    const dx = Math.abs(lng - lastDetectionMarkerAt.longitude);
    const dy = Math.abs(lat - lastDetectionMarkerAt.latitude);
    if (dt < 10_000 && (dx + dy) < 0.0002) return;
  }

  const body = {
    longitude: lng,
    latitude: lat,
    fire_count: Math.max(1, flames),
    source: 'uav_detect',
    status: 'pending' as const,
    level: normalizeDetectionLevel(d.level, d.risk_level),
    cause: normalizeRosFireCause(d.cause ?? d.fire_cause)
  };

  try {
    const created = await createFireMarker(t, body);
    lastDetectionMarkerAt = { longitude: lng, latitude: lat, ts: nowTs };
    // 先并入本地火点列表，避免 GET /fire-markers 略晚于写库时台账合并拿不到新 id
    lastFireMarkers.value = [created, ...lastFireMarkers.value.filter((m) => m.id !== created.id)];
    await refreshLedger();
  } catch (e) {
    // 这里不打断 WS 流；错误可在后续做 toast
    console.warn('基于无人机检测标点失败', e);
  }
}

function ensureHomeMarker() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (homeMarker) return;

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
    '  <path d="M10 30L32 12l22 18" stroke="rgba(255,255,255,0.92)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '  <path d="M18 28v22c0 2 2 4 4 4h20c2 0 4-2 4-4V28" fill="rgba(255,176,32,0.18)" stroke="rgba(255,176,32,0.95)" stroke-width="3" stroke-linejoin="round"/>' +
    '  <path d="M28 54V40c0-2 2-4 4-4s4 2 4 4v14" stroke="rgba(255,255,255,0.88)" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';
  const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  homeMarker = new AMap.Marker({
    position: [116.397428, 39.90923],
    map: map.value,
    anchor: 'center',
    offset: new AMap.Pixel(0, 0),
    zIndex: 190,
    title: 'Home',
    icon: new AMap.Icon({
      size: new AMap.Size(34, 34),
      image: iconUrl,
      imageSize: new AMap.Size(34, 34)
    })
  });
}

function updateHomeMarker(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureHomeMarker();
  homeMarker?.setPosition?.(new AMap.LngLat(lng, lat));
}

function ensureCarHomeMarker() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (carHomeMarker) return;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
    '  <path d="M10 30L32 12l22 18" stroke="rgba(255,255,255,0.92)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '  <path d="M18 28v22c0 2 2 4 4 4h20c2 0 4-2 4-4V28" fill="rgba(0,160,255,0.14)" stroke="rgba(0,160,255,0.95)" stroke-width="3" stroke-linejoin="round"/>' +
    '  <path d="M28 54V40c0-2 2-4 4-4s4 2 4 4v14" stroke="rgba(255,255,255,0.88)" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';
  const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  carHomeMarker = new AMap.Marker({
    position: [116.397428, 39.90923],
    map: map.value,
    anchor: 'center',
    offset: new AMap.Pixel(0, 0),
    zIndex: 189,
    title: '车Home',
    icon: new AMap.Icon({
      size: new AMap.Size(32, 32),
      image: iconUrl,
      imageSize: new AMap.Size(32, 32)
    })
  });
}

function updateCarHomeMarker(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureCarHomeMarker();
  carHomeMarker?.setPosition?.(new AMap.LngLat(lng, lat));
}

function ensureUavMarker() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (uavMarker) return;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
    '  <path d="M18 26h28" stroke="rgba(0,160,255,0.95)" stroke-width="3.5" stroke-linecap="round"/>' +
    '  <path d="M14 26c-4 0-7-3-7-7s3-7 7-7 7 3 7 7-3 7-7 7Z" stroke="rgba(0,160,255,0.85)" stroke-width="2.2"/>' +
    '  <path d="M50 26c-4 0-7-3-7-7s3-7 7-7 7 3 7 7-3 7-7 7Z" stroke="rgba(0,160,255,0.85)" stroke-width="2.2"/>' +
    '  <path d="M32 24c-7 0-12 5-12 12v4c0 3 3 6 6 6h12c3 0 6-3 6-6v-4c0-7-5-12-12-12Z" fill="rgba(0,255,168,0.28)" stroke="rgba(0,255,168,0.85)" stroke-width="2.2"/>' +
    '  <path d="M26 36h12" stroke="rgba(255,255,255,0.92)" stroke-width="2.2" stroke-linecap="round"/>' +
    '  <circle cx="32" cy="40" r="2.2" fill="rgba(255,255,255,0.95)"/>' +
    '</svg>';
  const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  uavMarker = new AMap.Marker({
    position: [116.397428, 39.90923],
    map: map.value,
    anchor: 'center',
    offset: new AMap.Pixel(0, 0),
    zIndex: 200,
    title: '无人机',
    icon: new AMap.Icon({
      size: new AMap.Size(44, 44),
      image: iconUrl,
      imageSize: new AMap.Size(44, 44)
    })
  });
}

function haversineMeters(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const c =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
}

function updateUavMarkerPosition(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureUavMarker();
  // 平滑移动：将遥测点设为目标点，由 rAF 推进
  targetPos = { lng, lat, ts: Date.now() };
  if (!displayedPos) {
    displayedPos = { lng, lat };
  }
  if (animRaf == null) {
    const step = () => {
      if (!map.value || !uavMarker || !displayedPos || !targetPos) {
        animRaf = null;
        return;
      }
      const dt = Date.now() - targetPos.ts;
      const duration = 420;
      const t = Math.min(1, dt / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      displayedPos.lng = displayedPos.lng + (targetPos.lng - displayedPos.lng) * ease;
      displayedPos.lat = displayedPos.lat + (targetPos.lat - displayedPos.lat) * ease;
      uavMarker.setPosition(new AMap.LngLat(displayedPos.lng, displayedPos.lat));
      updateFlightLine(displayedPos.lng, displayedPos.lat);
      // 返航到达判定：距离 Home 足够近后清除轨迹
      if (returningHome && returningHomeTarget) {
        const d = haversineMeters(
          { lng: displayedPos.lng, lat: displayedPos.lat },
          returningHomeTarget
        );
        if (d <= 15) {
          returningHome = false;
          returningHomeTarget = null;
          clearAllTrajectories();
        }
      }
      if (t < 1) {
        animRaf = requestAnimationFrame(step);
      } else {
        animRaf = null;
        displayedPos = { lng: targetPos.lng, lat: targetPos.lat };
      }
    };
    animRaf = requestAnimationFrame(step);
  }
}

function ensureFlightLine() {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  if (flightLineBase && flightLineFlow) return;
  flightLineBase = new AMap.Polyline({
    path: [],
    strokeColor: 'rgba(0, 132, 255, 0.95)',
    strokeWeight: 10,
    strokeOpacity: 0.92,
    strokeStyle: 'solid',
    lineJoin: 'round',
    zIndex: 160,
    outlineColor: 'rgba(0,0,0,0.18)',
    outlineWeight: 2
  });
  flightLineBase.setMap(map.value);

  // 白色“箭头/流动”层：用虚线 + dashoffset 动起来
  flightLineFlow = new AMap.Polyline({
    path: [],
    strokeColor: 'rgba(255, 255, 255, 0.90)',
    strokeWeight: 4,
    strokeOpacity: 0.9,
    strokeStyle: 'dashed',
    strokeDasharray: [16, 14],
    showDir: true,
    lineJoin: 'round',
    zIndex: 165
  });
  flightLineFlow.setMap(map.value);

  if (flightDashTimer == null) {
    flightDashTimer = window.setInterval(() => {
      flightDashOffset = (flightDashOffset + 4) % 2000;
      try {
        flightLineFlow?.setOptions?.({ strokeDashoffset: flightDashOffset });
      } catch {
        /* ignore */
      }
    }, 60);
  }
}

function updateFlightLine(lng: number, lat: number) {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;
  ensureFlightLine();
  if (!flightLineBase || !flightLineFlow) return;
  const path = flightLineBase.getPath?.() || [];
  path.push(new AMap.LngLat(lng, lat));
  // 控制长度，避免无限增长
  const max = MAX_FLIGHT_TRAIL_POINTS;
  const sliced = path.length > max ? path.slice(path.length - max) : path;
  flightLineBase.setPath(sliced);
  flightLineFlow.setPath(sliced);
}

function connectWs() {
  const t = token.value;
  if (!t) return;
  if (ws && ws.readyState === WebSocket.OPEN) return;
  if (ws && ws.readyState === WebSocket.CONNECTING) return;

  try {
    const url = buildWsUrl('/ws/uav', { token: t });
    ws = new WebSocket(url);
  } catch (e) {
    console.warn('WS 初始化失败', e);
    return;
  }

  ws.onmessage = (ev) => {
    let msg: any;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    const type = String(msg?.type || '');
    const payload = msg?.payload;

    if (type === 'uav.telemetry' && payload) {
      telemetry.value = payload as UavTelemetryPayload;
      // 首次收到遥测：记录 Home（默认）+ 定位到无人机位置
      if (!homePos.value) {
        homePos.value = { lng: Number(telemetry.value.longitude), lat: Number(telemetry.value.latitude) };
        if (map.value) {
          updateHomeMarker(homePos.value.lng, homePos.value.lat);
        }
      }
      // 首次收到遥测：定位到无人机位置
      if (!hasFocusedOnUav && map.value) {
        try {
          map.value.setCenter([telemetry.value.longitude, telemetry.value.latitude]);
          map.value.setZoom(16);
          hasFocusedOnUav = true;
        } catch {
          /* ignore */
        }
      }
      updateUavMarkerPosition(telemetry.value.longitude, telemetry.value.latitude);
      return;
    }
    if (type === 'uav.detection' && payload) {
      detection.value = payload as UavDetectionPayload;
      void persistFireMarkerFromDetection(detection.value);
      return;
    }
    if (type === 'fleet.arrived' && payload) {
      fleetArrived.value = payload as FleetArrivedPayload;
      if (fleetArrived.value.arrived) {
        alert('车队已抵达，开始处理火焰。');
      }
      return;
    }
    if (type === 'fleet.telemetry' && payload) {
      const lng = Number(payload?.longitude);
      const lat = Number(payload?.latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      car.pos = { lng, lat };
      if (!car.home) {
        car.home = { lng, lat };
        updateCarHomeMarker(lng, lat);
      }
      updateCarMarker(lng, lat);
      return;
    }
  };

  ws.onclose = () => {
    ws = null;
  };
}

function disconnectWs() {
  try {
    ws?.close?.();
  } catch {
    /* ignore */
  }
  ws = null;
}

async function refreshLedger() {
  const t = token.value;
  if (!t) return;
  ledgerLoading.value = true;
  ledgerError.value = '';
  try {
    const { items: apiMarkers } = await listFireMarkers(t, { page: 1, page_size: 200 });
    const mergedById = new Map<number, FireMarkerItem>();
    for (const m of apiMarkers) mergedById.set(m.id, m);
    for (const m of lastFireMarkers.value) {
      if (!mergedById.has(m.id)) mergedById.set(m.id, m);
    }
    lastFireMarkers.value = Array.from(mergedById.values());

    const res = await listFireLedger(t, { page: 1, page_size: 50 });
    const byId = markersToIdMap(lastFireMarkers.value);
    let items = await enrichLedgerItems(t, res.items, byId);
    items = await mergeLedgerWithPendingMarkers(
      t,
      items,
      lastFireMarkers.value,
      user.value?.username || '—'
    );
    ledgerItems.value = items;
    ledgerTotal.value = res.total + (items.length - res.items.length);
  } catch (e) {
    ledgerError.value = e instanceof Error ? e.message : '台账加载失败';
  } finally {
    ledgerLoading.value = false;
  }
}

const onGeoServiceHint = (ev: Event) => {
  const m = (ev as CustomEvent<{ message?: string }>).detail?.message;
  if (m) mapGeoHint.value = m;
};

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
  window.addEventListener('forestfire-geo-service', onGeoServiceHint);
});

onUnmounted(() => {
  window.removeEventListener('forestfire-geo-service', onGeoServiceHint);
  if (clockTimer != null) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  try {
    stopSetHome();
    stopCarPickers();
    stopPlanning();
    clearRouteLine();
    disconnectWs();
    uavMarker?.remove?.();
    uavMarker = null;
    homeMarker?.remove?.();
    homeMarker = null;
    carMarker?.remove?.();
    carMarker = null;
    carHomeMarker?.remove?.();
    carHomeMarker = null;
    clearCarPlanLine();
    clearCarTrail();
    carTrailBase?.remove?.();
    carTrailBase = null;
    carTrailFlow?.remove?.();
    carTrailFlow = null;
    flightLineBase?.remove?.();
    flightLineBase = null;
    flightLineFlow?.remove?.();
    flightLineFlow = null;
    clearReturnPlan();
    if (flightDashTimer != null) {
      clearInterval(flightDashTimer);
      flightDashTimer = null;
    }
    if (carDashTimer != null) {
      clearInterval(carDashTimer);
      carDashTimer = null;
    }
    if (animRaf != null) {
      cancelAnimationFrame(animRaf);
      animRaf = null;
    }
    if (carAnimRaf != null) {
      cancelAnimationFrame(carAnimRaf);
      carAnimRaf = null;
    }
    returningHome = false;
    returningHomeTarget = null;
    carReturningHome = false;
    carReturningHomeTarget = null;
  } catch {
    /* ignore */
  }
});

/** 登录后若地图尚未就绪（此前未登录无法 map-config），补一次 init */
watch(
  () => token.value,
  async (t) => {
    if (!t || isMapLoaded.value) return;
    await nextTick();
    if (!mapContainer.value) return;
    try {
      await initMap();
    } catch {
      /* mapInitError 已由 useMap 写入 */
    }
  }
);

watch(
  () => [token.value, isMapLoaded.value] as const,
  ([t, loaded]) => {
    if (!t || !loaded) return;
    connectWs();
    void refreshLedger();
  },
  { immediate: true }
);

void map;
</script>

<style scoped>
.uav-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 500;
  height: 72px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 18px 10px;
  background: linear-gradient(
    90deg,
    rgba(10, 40, 88, 0.92),
    rgba(22, 93, 255, 0.62),
    rgba(10, 40, 88, 0.92)
  );
  border-bottom: 1px solid rgba(38, 220, 255, 0.22);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  overflow: hidden;
}

.topbar::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: radial-gradient(680px 90px at 50% 0%, rgba(32, 214, 255, 0.35), transparent 60%),
    radial-gradient(520px 120px at 12% 30%, rgba(0, 255, 168, 0.14), transparent 65%),
    radial-gradient(520px 120px at 92% 30%, rgba(32, 214, 255, 0.12), transparent 65%);
  opacity: 0.9;
  pointer-events: none;
}

.topbar-left,
.topbar-right {
  position: relative;
  z-index: 1;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.topbar-brand-icon {
  font-size: 26px;
  filter: drop-shadow(0 0 16px rgba(32, 214, 255, 0.22));
}

.topbar-brand-text {
  min-width: 0;
}

.topbar-title {
  font-weight: 900;
  letter-spacing: 0.6px;
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-subtitle {
  font-size: 12px;
  color: rgba(210, 232, 246, 0.8);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar-time {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: rgba(210, 232, 246, 0.9);
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  white-space: nowrap;
}

.topbar-user {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  min-width: 0;
}

.topbar-user-role {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.topbar-user-name {
  font-size: 12px;
  font-weight: 800;
  color: rgba(236, 246, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.topbar-btn {
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.18);
  background: rgba(6, 14, 22, 0.20);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  transition: transform 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease),
    opacity 180ms var(--ease);
}

.topbar-btn:hover {
  transform: translateY(-1px);
  background: rgba(6, 14, 22, 0.28);
  border-color: rgba(32, 214, 255, 0.30);
}

.topbar-btn.danger {
  border-color: rgba(255, 77, 79, 0.30);
}

.topbar-btn.danger:hover {
  border-color: rgba(255, 77, 79, 0.45);
}

.layout {
  flex: 1 1 auto;
  padding: calc(14px + 72px + env(safe-area-inset-top, 0px)) 16px 18px;
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(520px, 1fr) minmax(300px, 360px);
  gap: 14px;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
}

.col {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.col.right {
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(240px, 1fr) minmax(260px, 1fr);
  align-content: stretch;
  height: 100%;
}

.glass-card {
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(38, 220, 255, 0.22);
  background: rgba(9, 18, 28, 0.72);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  overflow: hidden;
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
}

.glass-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 18px;
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.18) inset, 0 0 42px rgba(32, 214, 255, 0.10);
  pointer-events: none;
  opacity: 0.8;
}

.glass-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(32, 214, 255, 0.10);
  background: linear-gradient(180deg, rgba(32, 214, 255, 0.10), rgba(6, 14, 22, 0.0));
}

.glass-title {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.glass-tag {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.8);
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  white-space: nowrap;
}

.glass-bd {
  position: relative;
  z-index: 1;
  padding: 12px 14px 14px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mode-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.20);
  background: rgba(6, 14, 22, 0.22);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
  transition: transform 180ms var(--ease), background 180ms var(--ease), border-color 180ms var(--ease),
    opacity 180ms var(--ease);
}

.mode-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(6, 14, 22, 0.30);
  border-color: rgba(32, 214, 255, 0.35);
}

.mode-btn.active {
  border-color: rgba(0, 255, 168, 0.42);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.14), rgba(32, 214, 255, 0.08));
  box-shadow: 0 0 26px rgba(0, 255, 168, 0.10);
}

.mode-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ghost-btn,
.primary-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.20);
  background: rgba(6, 14, 22, 0.22);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 850;
  transition: transform 180ms var(--ease), background 180ms var(--ease), border-color 180ms var(--ease),
    box-shadow 180ms var(--ease), opacity 180ms var(--ease);
}

.ghost-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(32, 214, 255, 0.35);
  background: rgba(6, 14, 22, 0.30);
}

.primary-btn {
  border-color: rgba(0, 255, 168, 0.40);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.16), rgba(32, 214, 255, 0.10));
  box-shadow: 0 0 0 1px rgba(0, 255, 168, 0.10) inset, 0 0 32px rgba(32, 214, 255, 0.10);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(0, 255, 168, 0.56);
  box-shadow: 0 0 0 1px rgba(0, 255, 168, 0.14) inset, 0 0 44px rgba(0, 255, 168, 0.10);
}

.primary-btn.go {
  border-color: rgba(255, 176, 32, 0.36);
  background: linear-gradient(180deg, rgba(255, 176, 32, 0.18), rgba(245, 63, 63, 0.06));
  box-shadow: 0 0 0 1px rgba(255, 176, 32, 0.08) inset, 0 0 40px rgba(255, 176, 32, 0.10);
}

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.planning-tip {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(0, 255, 168, 0.20);
  background: rgba(0, 255, 168, 0.06);
}

.planning-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(0, 255, 168, 0.78);
  box-shadow: 0 0 16px rgba(0, 255, 168, 0.22);
  animation: pulseDot 1.6s ease-in-out infinite;
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.88);
  }
}

.planning-text {
  font-size: 12px;
  color: rgba(190, 240, 255, 0.88);
  font-weight: 750;
  line-height: 1.35;
}

.wp-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 2px;
}

.wp-title {
  font-size: 12px;
  font-weight: 900;
  color: rgba(236, 246, 255, 0.92);
}

.wp-tag {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.8);
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  white-space: nowrap;
}

.wp-list {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.wp-item {
  display: grid;
  grid-template-columns: 34px 1fr 30px;
  gap: 10px;
  align-items: center;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
}

.wp-idx {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.18);
  font-weight: 900;
  color: rgba(210, 232, 246, 0.9);
  font-variant-numeric: tabular-nums;
}

.wp-main {
  min-width: 0;
}

.wp-coord {
  font-size: 12px;
  font-weight: 850;
  color: rgba(236, 246, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wp-sub {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.wp-del {
  width: 30px;
  height: 30px;
  border-radius: 12px;
  border: 1px solid rgba(255, 77, 79, 0.28);
  background: rgba(255, 77, 79, 0.10);
  color: rgba(255, 210, 210, 0.95);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: grid;
  place-items: center;
  transition: transform 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease),
    opacity 180ms var(--ease);
}

.wp-del:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 77, 79, 0.45);
  background: rgba(255, 77, 79, 0.16);
}

.wp-del:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.manual-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 2px;
}

.manual-title {
  font-size: 12px;
  font-weight: 900;
  color: rgba(236, 246, 255, 0.92);
}

.manual-tag {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.8);
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  white-space: nowrap;
}

.manual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.field.span2 {
  grid-column: 1 / -1;
}

.field-lab {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
  font-weight: 750;
}

.field-input {
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.92);
  padding: 0 10px;
  outline: none;
  font-size: 12px;
}

.field-input:focus {
  border-color: rgba(0, 255, 168, 0.42);
  box-shadow: 0 0 0 3px rgba(0, 255, 168, 0.08);
}

.manual-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.seg3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.seg-btn {
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.90);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  transition: transform 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease),
    opacity 180ms var(--ease);
}

.seg-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(32, 214, 255, 0.26);
  background: rgba(6, 14, 22, 0.22);
}

.seg-btn.active {
  border-color: rgba(0, 255, 168, 0.42);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.14), rgba(32, 214, 255, 0.08));
  box-shadow: 0 0 26px rgba(0, 255, 168, 0.1);
}

.seg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.scan-box {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.12);
  padding: 10px 10px 10px;
  display: grid;
  gap: 10px;
}

.scan-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: rgba(236, 246, 255, 0.88);
}

.scan-lab {
  color: rgba(190, 220, 235, 0.72);
  font-weight: 750;
  white-space: nowrap;
}

.scan-input {
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.92);
  padding: 0 10px;
  outline: none;
  font-size: 12px;
  width: 90px;
}

.scan-input:focus {
  border-color: rgba(0, 255, 168, 0.42);
  box-shadow: 0 0 0 3px rgba(0, 255, 168, 0.08);
}

.fleet-panel {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.12);
  padding: 10px 10px 10px;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.fleet-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.fleet-title {
  font-size: 12px;
  font-weight: 900;
  color: rgba(236, 246, 255, 0.92);
}

.fleet-subhd {
  font-size: 11px;
  font-weight: 850;
  color: rgba(190, 220, 235, 0.78);
  padding-top: 2px;
}

.fleet-line {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.14);
}

.fleet-k {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
  font-weight: 750;
  white-space: nowrap;
}

.fleet-v {
  font-size: 12px;
  color: rgba(236, 246, 255, 0.90);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.fleet-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-width: 0;
}

.fleet-input {
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.92);
  padding: 0 10px;
  outline: none;
  font-size: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.fleet-input:focus {
  border-color: rgba(0, 255, 168, 0.42);
  box-shadow: 0 0 0 3px rgba(0, 255, 168, 0.08);
}

.fleet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.home-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
}

.home-text {
  font-size: 12px;
  color: rgba(190, 220, 235, 0.82);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ghost-btn.warn {
  border-color: rgba(255, 176, 32, 0.28);
}

.signal-wait {
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 176, 32, 0.22);
  background: rgba(255, 176, 32, 0.10);
  color: rgba(255, 230, 200, 0.95);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.4;
}

/* 无人机 marker：使用 Icon（避免缩放漂移）；动效仅保留飞行轨迹 */

:deep(.ret-dot) {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 176, 32, 0.55);
  background: rgba(255, 176, 32, 0.18);
  color: rgba(255, 230, 200, 0.95);
  font-size: 10px;
  font-weight: 900;
  display: grid;
  place-items: center;
  box-shadow: 0 0 18px rgba(255, 176, 32, 0.12);
}

:deep(.ret-dot.end) {
  border-color: rgba(0, 255, 168, 0.55);
  background: rgba(0, 255, 168, 0.16);
  color: rgba(170, 255, 245, 0.95);
}


.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.status-pill {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 9px;
}

.status-lab {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.status-val {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 900;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.status-chip {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
}

.status-chip.st-none {
  border-color: rgba(38, 220, 255, 0.14);
  color: rgba(190, 220, 235, 0.72);
}

.status-chip.st-flying {
  border-color: rgba(0, 255, 168, 0.30);
  color: rgba(170, 255, 245, 0.92);
}

.status-chip.st-hovering {
  border-color: rgba(255, 176, 32, 0.28);
  color: rgba(255, 210, 160, 0.92);
}

.status-chip.st-landed {
  border-color: rgba(190, 220, 235, 0.22);
  color: rgba(190, 220, 235, 0.85);
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.result-pill {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 9px;
}

.result-lab {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.result-val {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 900;
}

.compass-wrap {
  margin-top: 10px;
}

.muted-note {
  font-size: 12px;
  color: rgba(190, 220, 235, 0.72);
  line-height: 1.45;
}

.map-shell {
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 18px;
  border: 1px solid rgba(38, 220, 255, 0.24);
  background: rgba(9, 18, 28, 0.55);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.50);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
}

.map-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(32, 214, 255, 0.10);
  background: linear-gradient(180deg, rgba(32, 214, 255, 0.10), rgba(6, 14, 22, 0.0));
}

.map-surface-alert {
  flex: 1 1 100%;
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 125, 0, 0.35);
  background: rgba(255, 125, 0, 0.12);
  color: rgba(255, 230, 200, 0.95);
  font-size: 12px;
  line-height: 1.45;
}

.map-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-left: auto;
}

.map-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.16);
  background: rgba(6, 14, 22, 0.20);
  font-size: 12px;
  color: rgba(190, 220, 235, 0.78);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(160, 220, 240, 0.28);
  box-shadow: 0 0 16px rgba(160, 220, 240, 0.12);
}

.dot.ok {
  background: rgba(0, 255, 168, 0.72);
  box-shadow: 0 0 18px rgba(0, 255, 168, 0.22);
}

.dot.warn {
  background: rgba(255, 176, 32, 0.75);
  box-shadow: 0 0 18px rgba(255, 176, 32, 0.20);
}

.map-body {
  position: relative;
  min-height: 0;
}

.map-container {
  width: 100%;
  height: 100%;
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: minmax(280px, 340px) 1fr;
    grid-template-areas:
      "left center"
      "right center";
  }
  .col.left {
    grid-area: left;
  }
  .col.center {
    grid-area: center;
  }
  .col.right {
    grid-area: right;
  }
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .topbar {
    grid-template-columns: 1fr;
    height: auto;
    gap: 10px;
    padding: 12px 14px;
  }
  .topbar-right {
    justify-content: space-between;
    flex-wrap: wrap;
  }
}
</style>

