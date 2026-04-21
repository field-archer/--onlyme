<template>
  <div class="map-page">
    <header class="topbar">
      <div class="topbar-left">
        <div class="topbar-brand" aria-label="系统名称">
          <span class="topbar-brand-icon" aria-hidden="true">🔥</span>
          <div class="topbar-brand-text">
            <div class="topbar-title">林火检测智慧管控平台</div>
            <div class="topbar-subtitle">实时监测・精准预警・高效处置</div>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="topbar-time" aria-label="当前时间">{{ nowText }}</div>
        <div v-if="user" class="topbar-user">
          <div class="topbar-user-role">巡查员</div>
          <div class="topbar-user-name">{{ user.username }}</div>
        </div>
        <button class="topbar-btn" type="button" @click="goToMain">
          <span aria-hidden="true">🏠</span>
          主页
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
            <div class="glass-title">地图操作</div>
            <div class="glass-tag">{{ isMapLoaded ? '已加载' : '加载中…' }}</div>
          </div>
          <div class="glass-bd">
            <div class="search-row">
              <input
                v-model="searchKeyword"
                type="search"
                class="search-input"
                placeholder="输入地名或 POI，回车搜索"
                :disabled="!isMapLoaded || searchLoading"
                enterkeyhint="search"
                @keyup.enter="handlePlaceSearch"
              />
              <button
                type="button"
                class="search-submit-btn"
                :disabled="!isMapLoaded || searchLoading"
                @click="handlePlaceSearch"
              >
                {{ searchLoading ? '搜索中…' : '搜索' }}
              </button>
            </div>
            <p v-if="searchMessage" class="search-message">{{ searchMessage }}</p>
            <ul v-if="searchResults.length" class="search-results" role="listbox">
              <li
                v-for="(poi, idx) in searchResults"
                :key="`${poi.id}-${idx}`"
                class="search-result-item"
                :class="{ 'is-active': selectedPoiId === `${poi.id}-${idx}` }"
                role="option"
                @click="selectSearchPoi(poi, idx)"
              >
                <div class="poi-name">{{ poi.name }}</div>
                <div class="poi-addr">{{ poi.address || '地址不详' }}</div>
              </li>
            </ul>
            <div class="btn-grid">
              <button class="primary-btn" type="button" @click="toggleFireMarking" :disabled="!isMapLoaded">
                <span aria-hidden="true">🔥</span>
                {{ isFireMarking ? '退出标记' : '标记火点' }}
              </button>
              <button class="ghost-btn" type="button" @click="locateMe" :disabled="!isMapLoaded">
                <span aria-hidden="true">🧭</span>
                定位
              </button>
            </div>
            <div class="level-row">
              <div class="level-label">火焰等级</div>
              <div class="level-seg level-flame" role="radiogroup" aria-label="火焰等级选择">
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedLevel === 'low', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedLevel = 'low'"
                >
                  低
                </button>
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedLevel === 'medium', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedLevel = 'medium'"
                >
                  中
                </button>
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedLevel === 'high', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedLevel = 'high'"
                >
                  高
                </button>
              </div>
            </div>

            <div class="level-row">
              <div class="level-label">火灾原因</div>
              <div class="level-seg cause" role="radiogroup" aria-label="火灾原因选择">
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedCause === 'human', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedCause = 'human'"
                >
                  人为
                </button>
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedCause === 'lightning', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedCause = 'lightning'"
                >
                  雷击
                </button>
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedCause === 'farming', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedCause = 'farming'"
                >
                  农事
                </button>
                <button
                  type="button"
                  class="level-btn"
                  :class="{ active: selectedCause === 'unknown', disabled: !isFireMarking }"
                  :disabled="!isFireMarking"
                  @click="selectedCause = 'unknown'"
                >
                  未知
                </button>
              </div>
            </div>
            <div v-if="isFireMarking" class="muted-note">标记模式已开启：点击地图任意位置立即上报火点（状态：未处置）。</div>
            <div class="kpi-row">
              <div class="kpi">
                <div class="kpi-label">火点标记</div>
                <div class="kpi-value">{{ markers.length }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">同步</div>
                <div class="kpi-value" :class="{ blink: markersSyncing }">
                  {{ markersSyncing ? '进行中' : '就绪' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="glass-hd">
            <div class="glass-title">火险态势总览</div>
            <div class="glass-tag">今日</div>
          </div>
          <div class="glass-bd">
            <div class="overview-grid">
              <div class="metric">
                <div class="metric-label">今日上报</div>
                <div class="metric-value">{{ dashboard?.overview.today_reported ?? 0 }}</div>
              </div>
              <div class="metric warn">
                <div class="metric-label">未处置</div>
                <div class="metric-value">{{ dashboard?.overview.pending ?? 0 }}</div>
              </div>
              <div class="metric ok">
                <div class="metric-label">已扑灭</div>
                <div class="metric-value">{{ dashboard?.overview.extinguished ?? 0 }}</div>
              </div>
              <div class="metric danger">
                <div class="metric-label">处置中</div>
                <div class="metric-value">{{ dashboard?.overview.handling ?? 0 }}</div>
              </div>
            </div>
            <div class="mini-kpis">
              <div class="mini-kpi">
                <div class="mini-kpi-label">高等级</div>
                <div class="mini-kpi-value danger">{{ dashboard?.overview.level_counts.high ?? 0 }}</div>
              </div>
              <div class="mini-kpi">
                <div class="mini-kpi-label">中等级</div>
                <div class="mini-kpi-value warn">{{ dashboard?.overview.level_counts.medium ?? 0 }}</div>
              </div>
              <div class="mini-kpi">
                <div class="mini-kpi-label">低等级</div>
                <div class="mini-kpi-value low-tier">{{ dashboard?.overview.level_counts.low ?? 0 }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="col center">
        <div class="map-shell">
          <div class="map-head">
            <div v-if="mapSurfaceAlert" class="map-surface-alert" role="alert">{{ mapSurfaceAlert }}</div>
            <div class="map-head-right">
              <div class="map-status">
                <span class="dot" :class="{ ok: isMapLoaded, warn: !isMapLoaded }"></span>
                <span>{{ isMapLoaded ? '地图已就绪' : '地图加载中' }}</span>
              </div>
            </div>
          </div>
            <div class="map-body">
            <div ref="mapContainer" class="map-container"></div>
            <div class="map-controls">
              <button class="ctrl-btn" type="button" @click="locateMe" :disabled="!isMapLoaded" aria-label="定位">
                <span aria-hidden="true">📍</span>
              </button>
              <button class="ctrl-btn" type="button" :disabled="!isMapLoaded" aria-label="全屏">
                <span aria-hidden="true">⛶</span>
              </button>
              <button class="ctrl-btn" type="button" :disabled="!isMapLoaded" aria-label="图层">
                <span aria-hidden="true">🗂️</span>
              </button>
              <button class="ctrl-btn" type="button" :disabled="!isMapLoaded" aria-label="测距">
                <span aria-hidden="true">📏</span>
              </button>
            </div>
            <div v-if="isFireMarking" class="selecting-overlay">
              <div class="selecting-hint">
                <div class="hint-icon">🎯</div>
                <p>标记模式：点击地图上报火点</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="col right" @wheel.stop @touchmove.stop>
        <div class="glass-card stats">
          <div class="glass-hd">
            <div class="glass-title">火情统计分析</div>
            <div class="glass-tag">近 30 天</div>
          </div>
          <div class="glass-bd stats-bd">
            <FireStatsCharts :data="dashboard" />
            <div v-if="dashboardLoading" class="muted-note">统计数据加载中…</div>
            <div v-else-if="dashboardError" class="muted-note">{{ dashboardError }}</div>
          </div>
        </div>

        <div class="glass-card ledger">
          <div class="glass-hd">
            <div class="glass-title">火情处置台账</div>
            <div class="glass-tag">日志</div>
          </div>
          <div class="glass-bd ledger-bd">
            <div class="ledger-kpis">
              <div class="ledger-kpi">
                <div class="ledger-kpi-label">总记录</div>
                <div class="ledger-kpi-value">{{ ledgerTotal }}</div>
              </div>
              <div class="ledger-kpi">
                <div class="ledger-kpi-label">已加载</div>
                <div class="ledger-kpi-value">{{ ledgerItems.length }}</div>
              </div>
              <div class="ledger-kpi">
                <div class="ledger-kpi-label">状态</div>
                <div class="ledger-kpi-value ok">{{ ledgerLoading ? '拉取中' : '就绪' }}</div>
              </div>
            </div>
            <div class="ledger-scroll" role="list">
              <div v-if="ledgerError" class="muted-note">{{ ledgerError }}</div>
              <div v-else-if="ledgerLoading && ledgerItems.length === 0" class="muted-note">台账加载中…</div>
              <div v-else-if="ledgerItems.length === 0" class="muted-note">暂无台账记录</div>
              <div v-for="it in ledgerItems" :key="it.id" class="ledger-log" role="listitem">
                <div class="ledger-log-top">
                  <span v-if="it.id < 0" class="ledger-chip new-marker" title="尚未写入处置事件，由前端根据火点补显">新标记</span>
                  <span class="ledger-chip level" :class="`lv-${it.level}`">等级：{{ levelText(it.level) }}</span>
                  <span class="ledger-chip status" :class="`st-${it.status}`">{{ statusText(it.status) }}</span>
                  <span class="ledger-time">{{ formatTime(it.updated_at) }}</span>
                </div>
                <div class="ledger-log-main">
                  <div class="ledger-loc">{{ it.region }}</div>
                  <div class="ledger-meta">护林员：{{ it.reporter_username }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <FireMarkerEditDialog
      v-if="editDialog.open"
      :status="editDialog.status"
      :level="editDialog.level"
      :cause="editDialog.cause"
      @close="editDialog.open = false"
      @save="applyMarkerEdit"
      @delete="removeFireMarkerFromDb"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMap } from '../composables/useMap';
import { fetchGeoMapConfig, geoPlaceSearch, type GeoPlaceSearchItem } from '../api/geo';
import { useAuth } from '../composables/useAuth';
import { createFireMarker, deleteFireMarker, listFireMarkers, updateFireMarker } from '../api/fireMarkers';
import { ApiError } from '../api/client';
import { lngLatInputToCoords } from '../utils/geo';
import { getFireDashboard } from '../api/fireDashboard';
import { listFireLedger } from '../api/fireLedger';
import FireStatsCharts from '../components/FireStatsCharts.vue';
import FireMarkerEditDialog from '../components/FireMarkerEditDialog.vue';
import type {
  FireCause,
  FireDashboardData,
  FireLedgerItem,
  FireLevel,
  FireMarkerItem,
  FireStatus
} from '../api/types';
import { formatIsoTime, levelText, statusText } from '../utils/fire';
import {
  buildRegionBarFromMarkers,
  enrichLedgerItems,
  isServerRegionBarUseful,
  markersToIdMap,
  mergeLedgerWithPendingMarkers
} from '../utils/regionEnrichment';
import { notifyGeoServiceError } from '../utils/geoApiError';

// 路由实例
const router = useRouter();
// 路由参数
const route = useRoute();
// 地图容器引用
const mapContainer = ref<HTMLElement | null>(null);
const isFireMarking = ref(false);
const selectedLevel = ref<FireLevel>('low');
const selectedCause = ref<FireCause>('unknown');

// 使用地图组合式函数
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

const mapGeoHint = ref('');

const {
  map,
  getCurrentLocation,
  focusMapOn,
  addFireMarker,
  clearMarkers,
  markers,
  isMapLoaded,
  mapInitError,
  initMap
} = useMap(mapContainer, {
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

const markersSyncing = ref(false);

function logoutAndHome() {
  logout();
  router.push('/');
}

const searchKeyword = ref('');
const searchResults = ref<GeoPlaceSearchItem[]>([]);
const searchLoading = ref(false);
const searchMessage = ref('');
const selectedPoiId = ref<string | null>(null);

const resetSearchUi = () => {
  searchKeyword.value = '';
  searchResults.value = [];
  searchMessage.value = '';
  selectedPoiId.value = null;
};

const handlePlaceSearch = async () => {
  if (!isMapLoaded.value) return;
  const kw = searchKeyword.value.trim();
  if (!kw) {
    searchMessage.value = '请输入要搜索的地名';
    searchResults.value = [];
    return;
  }
  const t = token.value;
  if (!t) {
    searchMessage.value = '请先登录后再搜索';
    searchResults.value = [];
    return;
  }
  searchLoading.value = true;
  searchMessage.value = '';
  try {
    const list = await geoPlaceSearch(t, kw);
    searchResults.value = list;
    selectedPoiId.value = null;
    if (list.length === 0) {
      searchMessage.value = '未找到相关地点，可换个关键词，或开启「标记火点」后在图上点击';
    }
  } catch (e: unknown) {
    notifyGeoServiceError(e);
    searchMessage.value =
      e instanceof ApiError ? e.message : e instanceof Error ? e.message : '搜索失败，请稍后重试';
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
};

/** 选中搜索结果：飞到该点预览（4b），并设待确认位置 */
const selectSearchPoi = (poi: GeoPlaceSearchItem, idx: number) => {
  if (!map.value) return;
  const AMap = (window as any).AMap;
  if (!AMap) return;

  selectedPoiId.value = `${poi.id}-${idx}`;
  focusMapOn(poi.location);

};


const formatTime = formatIsoTime;

const lastFireMarkers = ref<FireMarkerItem[]>([]);

async function refreshDashboard() {
  const t = token.value;
  if (!t) return;
  dashboardLoading.value = true;
  dashboardError.value = '';
  try {
    const d = await getFireDashboard(t);
    let region_bar = d.region_bar;
    if (!isServerRegionBarUseful(region_bar) && lastFireMarkers.value.length > 0) {
      try {
        region_bar = await buildRegionBarFromMarkers(t, lastFireMarkers.value);
      } catch (e) {
        console.warn('各区县火情数量：用火点补全失败，使用接口 region_bar', e);
      }
    }
    dashboard.value = { ...d, region_bar };
  } catch (e) {
    if (e instanceof ApiError && e.code === 40100) {
      logout();
      router.replace({ name: 'login', query: { redirect: route.fullPath } });
      return;
    }
    dashboardError.value = e instanceof Error ? e.message : '统计数据加载失败';
  } finally {
    dashboardLoading.value = false;
  }
}

async function refreshLedger() {
  const t = token.value;
  if (!t) return;
  ledgerLoading.value = true;
  ledgerError.value = '';
  try {
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
    /** 接口事件总数 + 本页补显的「仅有火点、尚无事件」条数，便于与列表长度对齐 */
    ledgerTotal.value = res.total + (items.length - res.items.length);
  } catch (e) {
    if (e instanceof ApiError && e.code === 40100) {
      logout();
      router.replace({ name: 'login', query: { redirect: route.fullPath } });
      return;
    }
    ledgerError.value = e instanceof Error ? e.message : '台账加载失败';
  } finally {
    ledgerLoading.value = false;
  }
}

const markerMeta = ref<Record<number, { status: FireStatus; level: FireLevel; cause: FireCause }>>({});

const editDialog = ref<{
  open: boolean;
  markerId: number | null;
  status: FireStatus;
  level: FireLevel;
  cause: FireCause;
}>({
  open: false,
  markerId: null,
  status: 'pending',
  level: 'low',
  cause: 'unknown'
});

function openEditDialog(serverId: number | undefined) {
  if (!serverId) return;
  const meta = markerMeta.value[serverId] || { status: 'pending', level: 'low', cause: 'unknown' };
  editDialog.value = { open: true, markerId: serverId, ...meta };
}

async function applyMarkerEdit(payload: { status: FireStatus; level: FireLevel; cause: FireCause }) {
  const id = editDialog.value.markerId;
  editDialog.value.open = false;
  if (!id) return;
  const t = token.value;
  if (!t) return;
  try {
    const updated = await updateFireMarker(t, id, payload);
    markerMeta.value[id] = {
      status: updated.status ?? payload.status,
      level: updated.level ?? payload.level,
      cause: updated.cause ?? payload.cause
    };
    await refreshMarkers();
    await Promise.all([refreshDashboard(), refreshLedger()]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 40100) {
      logout();
      router.replace({ name: 'login', query: { redirect: route.fullPath } });
      return;
    }
    alert(e instanceof Error ? e.message : '更新状态失败');
  }
}

/** 调用 DELETE /fire-markers/{id}，由后端删除数据库记录（与「已扑灭」仅改 status 不同） */
async function removeFireMarkerFromDb() {
  const id = editDialog.value.markerId;
  if (!id) return;
  if (
    !confirm(
      '确定从系统永久删除该火点？\n\n将请求后端删除数据库中的该条记录（及应级联删除的关联数据），不可恢复。'
    )
  ) {
    return;
  }
  const t = token.value;
  if (!t) return;
  editDialog.value.open = false;
  try {
    await deleteFireMarker(t, id);
    delete markerMeta.value[id];
    await refreshMarkers();
    await Promise.all([refreshDashboard(), refreshLedger()]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 40100) {
      logout();
      router.replace({ name: 'login', query: { redirect: route.fullPath } });
      return;
    }
    alert(e instanceof Error ? e.message : '删除失败');
  }
}

const markFireOnMap = async (event: any) => {
  if (!isFireMarking.value) return;
  const t = token.value;
  if (!t) {
    alert('请先登录');
    router.push({ name: 'login', query: { redirect: route.fullPath } });
    return;
  }
  const [lng, lat] = lngLatInputToCoords(event?.lnglat);
  const fc = Math.max(1, parseInt(sessionStorage.getItem('forestfire_last_fire_count') || '1', 10));
  try {
    const created = await createFireMarker(t, {
      longitude: lng,
      latitude: lat,
      fire_count: fc,
      source: 'map_click',
      status: 'pending',
      level: selectedLevel.value,
      cause: selectedCause.value
    });
    markerMeta.value[created.id] = {
      status: created.status ?? 'pending',
      level: created.level ?? selectedLevel.value,
      cause: created.cause ?? selectedCause.value
    };
    addFireMarker([lng, lat], {
      serverId: created.id,
      fireCount: created.fire_count,
      markedAt: created.marked_at,
      level: selectedLevel.value,
      cause: selectedCause.value,
      onMarkerClick: ({ serverId }) => openEditDialog(serverId)
    });
    await refreshMarkers();
    await Promise.all([refreshDashboard(), refreshLedger()]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 40100) {
      logout();
      router.replace({ name: 'login', query: { redirect: route.fullPath } });
      return;
    }
    alert(e instanceof Error ? e.message : '标记失败');
  }
};

const toggleFireMarking = () => {
  if (!map.value) {
    alert('地图尚未加载完成，请稍后再试');
    return;
  }
  isFireMarking.value = !isFireMarking.value;
  if (isFireMarking.value) {
    selectedLevel.value = 'low';
    selectedCause.value = 'unknown';
    map.value.on('click', markFireOnMap);
  } else {
    map.value.off('click', markFireOnMap);
  }
};

async function refreshMarkers() {
  const t = token.value;
  if (!t) {
    lastFireMarkers.value = [];
    return;
  }
  markersSyncing.value = true;
  try {
    const { items } = await listFireMarkers(t, { page: 1, page_size: 200 });
    lastFireMarkers.value = items;
    clearMarkers();
    const meta: Record<number, { status: FireStatus; level: FireLevel; cause: FireCause }> = {};
    for (const it of items) {
      const status = (it.status ?? 'pending') as FireStatus;
      const level = (it.level ?? 'low') as FireLevel;
      const cause = (it.cause ?? 'unknown') as FireCause;
      // 已扑灭：仅台账/统计保留记录，地图上不展示标点（与 PATCH 后后端 status=extinguished 一致）
      if (status === 'extinguished') continue;
      meta[it.id] = { status, level, cause };
      addFireMarker([it.longitude, it.latitude], {
        serverId: it.id,
        fireCount: it.fire_count,
        markedAt: it.marked_at,
        level: it.level ?? 'low',
        cause: it.cause ?? 'unknown',
        onMarkerClick: ({ serverId }) => openEditDialog(serverId)
      });
    }
    markerMeta.value = meta;
  } finally {
    markersSyncing.value = false;
  }
}

// 定位功能
const locateMe = async () => {
  if (!map.value) {
    alert('地图尚未加载完成，请稍后再试');
    return;
  }
  try {
    const result = await getCurrentLocation();
    const lnglat = result.position;
    map.value.setCenter(lnglat);
    map.value.setZoom(15);
  } catch (error) {
    alert('定位失败：' + (error as Error).message);
  }
};

// 返回主页
const goToMain = () => {
  isFireMarking.value = false;
  map.value?.off('click', markFireOnMap);
  resetSearchUi();
  router.push('/');
};

watch(isMapLoaded, (loaded) => {
  if (!loaded) return;

  const run = async () => {
    try {
      await refreshMarkers();
    } catch (e) {
      console.error('拉取火点标记失败:', e);
      if (e instanceof ApiError && e.code === 40100) {
        logout();
        router.replace({ name: 'login', query: { redirect: route.fullPath } });
      }
    }

    try {
      const result = await getCurrentLocation();
      const lnglat = result.position;
      if (map.value) {
        map.value.setCenter(lnglat);
        map.value.setZoom(15);
      }
    } catch (error) {
      console.error('自动定位失败:', error);
    }

    if (route.query.detect === 'true') {
      setTimeout(async () => {
        try {
          const t = token.value;
          if (!t) return;
          const result = await getCurrentLocation();
          const [lng, lat] = lngLatInputToCoords(result.position);
          const fc = Math.max(
            1,
            parseInt(sessionStorage.getItem('forestfire_last_fire_count') || '1', 10)
          );
          const created = await createFireMarker(t, {
            longitude: lng,
            latitude: lat,
            fire_count: fc,
            source: 'auto_detect',
            status: 'pending'
          });
          addFireMarker([lng, lat], {
            serverId: created.id,
            fireCount: created.fire_count,
            markedAt: created.marked_at,
            level: created.level ?? 'low',
            cause: created.cause ?? 'unknown',
            onMarkerClick: ({ serverId }) => openEditDialog(serverId)
          });
          markerMeta.value[created.id] = {
            status: created.status ?? 'pending',
            level: created.level ?? 'low',
            cause: created.cause ?? 'unknown'
          };
          await refreshMarkers();
          await Promise.all([refreshDashboard(), refreshLedger()]);
        } catch (error) {
          console.error('自动标记失败:', error);
        }
      }, 500);
    }
  };

  void run();
});

const dashboard = ref<FireDashboardData | null>(null);
const dashboardLoading = ref(false);
const dashboardError = ref('');

const ledgerItems = ref<FireLedgerItem[]>([]);
const ledgerTotal = ref(0);
const ledgerLoading = ref(false);
const ledgerError = ref('');

watch(
  () => token.value,
  (t) => {
    if (!t) {
      lastFireMarkers.value = [];
      return;
    }
    void (async () => {
      await refreshMarkers();
      await Promise.all([refreshDashboard(), refreshLedger()]);
    })();
  },
  { immediate: true }
);

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
  map.value?.off('click', markFireOnMap);
});
</script>

<style scoped>
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

.selecting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: fadeIn 0.3s ease-in-out;
}

.selecting-hint {
  background: rgba(6, 14, 22, 0.82);
  padding: 30px;
  border-radius: var(--radius-xl);
  text-align: center;
  border: 1px solid rgba(32, 214, 255, 0.18);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  pointer-events: auto;
  animation: scaleIn 0.3s ease-in-out;
  min-width: 250px;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.hint-icon {
  font-size: 48px;
  margin-bottom: 15px;
  animation: pulse 2s infinite;
}

.selecting-hint p {
  margin: 0;
  font-size: 16px;
  color: var(--text);
  font-weight: 500;
}

.map-page {
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
  background: linear-gradient(90deg, rgba(10, 40, 88, 0.92), rgba(22, 93, 255, 0.62), rgba(10, 40, 88, 0.92));
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
  filter: drop-shadow(0 0 16px rgba(255, 120, 40, 0.22));
}

.topbar-brand-text {
  min-width: 0;
}

.topbar-title {
  font-weight: 800;
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
  font-weight: 700;
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

.col.left {
  overflow: hidden;
  min-height: 0;
}

.col.right {
  overflow: auto;
  padding-right: 2px;
}

/* 左栏两张卡片：标题固定，内容区可滚动，避免「地图操作」「火险态势总览」底部被裁切 */
.col.left > .glass-card {
  flex: 1 1 0;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.col.left > .glass-card > .glass-bd {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.col.center {
  overflow: hidden;
}

.col.right {
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(260px, 1fr) minmax(260px, 1fr);
  align-content: stretch;
  height: 100%;
}

.glass-card.stats {
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
}

.stats-bd {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  overscroll-behavior: contain;
}

.glass-card.ledger {
  flex: unset;
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
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
  font-weight: 800;
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
  display: grid;
  gap: 12px;
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-grid {
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
  font-weight: 650;
  transition: transform 180ms var(--ease), background 180ms var(--ease), border-color 180ms var(--ease),
    box-shadow 180ms var(--ease), opacity 180ms var(--ease);
}

.ghost-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(32, 214, 255, 0.35);
  background: rgba(6, 14, 22, 0.30);
}

.ghost-btn.warn {
  border-color: rgba(255, 176, 32, 0.28);
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

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.kpi-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.kpi {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.18);
}

.kpi-label {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.76);
}

.kpi-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: 0.2px;
}

.blink {
  color: rgba(255, 176, 32, 0.95);
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.device-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.device-pill {
  border-radius: 14px;
  padding: 10px 10px 9px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.18);
  text-align: center;
}

.device-pill.ok {
  border-color: rgba(0, 255, 168, 0.24);
}

.device-pill.bad {
  border-color: rgba(255, 77, 79, 0.22);
}

.device-num {
  font-size: 18px;
  font-weight: 900;
}

.device-lab {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(190, 220, 235, 0.76);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.seg-btn {
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.16);
  color: rgba(236, 246, 255, 0.88);
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  transition: background 180ms var(--ease), border-color 180ms var(--ease);
}

.seg-btn.active {
  border-color: rgba(32, 214, 255, 0.30);
  background: rgba(32, 214, 255, 0.10);
}

.mini-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.mini-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.18);
}

.badge {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.18);
}

.badge.danger {
  border-color: rgba(245, 63, 63, 0.35);
  color: rgba(255, 180, 180, 0.92);
}

.badge.warn {
  border-color: rgba(255, 125, 0, 0.35);
  color: rgba(255, 210, 160, 0.92);
}

.badge.ok {
  border-color: rgba(0, 150, 136, 0.35);
  color: rgba(170, 255, 245, 0.92);
}

.mini-txt {
  font-size: 12px;
  color: rgba(236, 246, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-time {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
  white-space: nowrap;
}

.muted-note {
  font-size: 12px;
  color: rgba(190, 220, 235, 0.72);
  line-height: 1.45;
}

.level-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
}

.level-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(190, 220, 235, 0.78);
  white-space: nowrap;
}

.level-seg {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.level-btn {
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  color: rgba(236, 246, 255, 0.88);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  transition: transform 180ms var(--ease), background 180ms var(--ease), border-color 180ms var(--ease),
    opacity 180ms var(--ease);
}

.level-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(6, 14, 22, 0.22);
  border-color: rgba(32, 214, 255, 0.28);
}

.level-btn:disabled,
.level-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 火灾原因：保持原高亮 */
.level-seg.cause .level-btn.active {
  border-color: rgba(0, 255, 168, 0.42);
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.14), rgba(32, 214, 255, 0.08));
  box-shadow: 0 0 28px rgba(0, 255, 168, 0.1);
}

/* 火焰等级：低黄 / 中橙 / 高红 */
.level-seg.level-flame .level-btn:nth-child(1).active {
  border-color: rgba(255, 210, 60, 0.55);
  background: linear-gradient(180deg, rgba(255, 230, 120, 0.22), rgba(255, 180, 0, 0.1));
  box-shadow: 0 0 22px rgba(255, 200, 60, 0.2);
  color: rgba(40, 28, 0, 0.92);
}

.level-seg.level-flame .level-btn:nth-child(2).active {
  border-color: rgba(255, 145, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 170, 80, 0.2), rgba(255, 125, 0, 0.1));
  box-shadow: 0 0 22px rgba(255, 150, 40, 0.18);
}

.level-seg.level-flame .level-btn:nth-child(3).active {
  border-color: rgba(245, 63, 63, 0.55);
  background: linear-gradient(180deg, rgba(255, 120, 120, 0.2), rgba(245, 63, 63, 0.1));
  box-shadow: 0 0 22px rgba(255, 100, 100, 0.18);
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

.map-body {
  position: relative;
  min-height: 0;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: grid;
  gap: 10px;
  z-index: 40;
}

.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.24);
  background: rgba(6, 14, 22, 0.55);
  color: rgba(236, 246, 255, 0.92);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.10) inset, 0 18px 55px rgba(0, 0, 0, 0.35);
  transition: transform 180ms var(--ease), border-color 180ms var(--ease), background 180ms var(--ease),
    opacity 180ms var(--ease);
}

.ctrl-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(0, 255, 168, 0.42);
  background: rgba(6, 14, 22, 0.68);
}

.ctrl-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.18);
  padding: 10px 12px;
}

.metric-label {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.76);
}

.metric-value {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.metric.warn {
  border-color: rgba(255, 125, 0, 0.22);
}

.metric.ok {
  border-color: rgba(0, 150, 136, 0.22);
}

.metric.danger {
  border-color: rgba(245, 63, 63, 0.22);
}

.mini-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mini-kpi {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 12px;
}

.mini-kpi-label {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.mini-kpi-value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 900;
}

.mini-kpi-value.danger {
  color: rgba(255, 180, 180, 0.92);
}

.mini-kpi-value.warn {
  color: rgba(255, 210, 160, 0.92);
}

.mini-kpi-value.ok {
  color: rgba(170, 255, 245, 0.92);
}

.mini-kpi-value.low-tier {
  color: rgba(255, 230, 140, 0.95);
}

.chart-skeleton {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 12px 12px 10px;
}

.chart-bars {
  height: 140px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  align-items: end;
}

.bar {
  border-radius: 10px 10px 6px 6px;
  background: linear-gradient(180deg, rgba(32, 214, 255, 0.65), rgba(32, 214, 255, 0.14));
  box-shadow: 0 0 18px rgba(32, 214, 255, 0.18);
}

.chart-axis {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  font-size: 10px;
  color: rgba(190, 220, 235, 0.62);
  text-align: center;
}

.ledger-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.ledger-kpi {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 9px;
  text-align: center;
}

.ledger-kpi-label {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.ledger-kpi-value {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 900;
}

.ledger-kpi-value.ok {
  color: rgba(170, 255, 245, 0.92);
}

.glass-card.ledger {
  flex: 1 1 auto;
  min-height: 0;
}

.ledger-bd {
  grid-template-rows: auto 1fr auto;
  min-height: 0;
  overflow: hidden;
}

.ledger-scroll {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  gap: 10px;
  padding-right: 2px;
  height: 100%;
  max-height: 100%;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.ledger-log {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 11px;
  display: grid;
  gap: 8px;
}

.ledger-log-top {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.ledger-chip {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.ledger-chip.lv-low {
  border-color: rgba(255, 200, 60, 0.45);
  color: rgba(255, 235, 180, 0.95);
}

.ledger-chip.lv-medium {
  border-color: rgba(255, 125, 0, 0.35);
  color: rgba(255, 210, 160, 0.92);
}

.ledger-chip.lv-high {
  border-color: rgba(245, 63, 63, 0.35);
  color: rgba(255, 180, 180, 0.92);
}

.ledger-chip.st-pending {
  border-color: rgba(255, 125, 0, 0.28);
  color: rgba(255, 210, 160, 0.92);
}

.ledger-chip.st-handling {
  border-color: rgba(32, 214, 255, 0.28);
  color: rgba(190, 240, 255, 0.92);
}

.ledger-chip.st-extinguished {
  border-color: rgba(0, 150, 136, 0.30);
  color: rgba(170, 255, 245, 0.92);
}

.ledger-chip.new-marker {
  border-color: rgba(200, 160, 255, 0.45);
  color: rgba(230, 210, 255, 0.95);
  background: rgba(138, 43, 226, 0.12);
}

.ledger-log-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.ledger-meta,
.ledger-time {
  color: rgba(190, 220, 235, 0.72);
  font-size: 12px;
  white-space: nowrap;
}

.ledger-loc {
  font-weight: 850;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ledger-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.ledger-item {
  display: grid;
  grid-template-columns: 64px 1fr 72px 72px;
  gap: 10px;
  align-items: center;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  font-size: 12px;
  color: rgba(236, 246, 255, 0.88);
}

.ledger-time,
.ledger-person {
  color: rgba(190, 220, 235, 0.72);
  white-space: nowrap;
}

.ledger-loc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ledger-status {
  justify-self: end;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.ledger-status.warn {
  border-color: rgba(255, 125, 0, 0.35);
  color: rgba(255, 210, 160, 0.92);
}

.ledger-status.ok {
  border-color: rgba(0, 150, 136, 0.35);
  color: rgba(170, 255, 245, 0.92);
}

/* Responsive: narrow screens collapse side panels */
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