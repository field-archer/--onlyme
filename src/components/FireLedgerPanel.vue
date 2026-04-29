<template>
  <div class="panel">
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-lab">总记录</div>
        <div class="kpi-val">{{ total }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lab">已加载</div>
        <div class="kpi-val">{{ items.length }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lab">状态</div>
        <div class="kpi-val ok">{{ loading ? '拉取中' : '就绪' }}</div>
      </div>
    </div>

    <div class="scroll" role="list">
      <div v-if="error" class="muted">{{ error }}</div>
      <div v-else-if="loading && items.length === 0" class="muted">台账加载中…</div>
      <div v-else-if="items.length === 0" class="muted">暂无台账记录</div>
      <div v-for="it in items" :key="it.id" class="log" role="listitem">
        <div class="top">
          <span v-if="it.id < 0" class="chip new-marker" title="尚未写入处置事件，由前端根据火点补显">新标记</span>
          <span class="chip level" :class="`lv-${it.level}`">等级：{{ levelText(it.level) }}</span>
          <span class="chip status" :class="`st-${it.status}`">{{ statusText(it.status) }}</span>
          <span class="time">{{ formatTime(it.updated_at) }}</span>
        </div>
        <div class="main">
          <div class="loc">{{ it.region }}</div>
          <div class="meta">护林员：{{ it.reporter_username }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FireLedgerItem } from '../api/types';
import { formatIsoTime, levelText, statusText } from '../utils/fire';

defineProps<{
  items: FireLedgerItem[];
  total: number;
  loading: boolean;
  error: string;
}>();

const formatTime = formatIsoTime;
</script>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  min-height: 0;
}

.kpis {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.kpi {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 9px;
  text-align: center;
}

.kpi-lab {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.kpi-val {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 900;
}

.kpi-val.ok {
  color: rgba(170, 255, 245, 0.92);
}

.scroll {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  gap: 10px;
  padding-right: 2px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.muted {
  font-size: 12px;
  color: rgba(190, 220, 235, 0.72);
  line-height: 1.45;
}

.log {
  border-radius: 16px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 11px;
  display: grid;
  gap: 8px;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.chip {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.14);
  background: rgba(6, 14, 22, 0.14);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.chip.lv-low {
  border-color: rgba(255, 200, 60, 0.45);
  color: rgba(255, 235, 180, 0.95);
}
.chip.lv-medium {
  border-color: rgba(255, 125, 0, 0.35);
  color: rgba(255, 210, 160, 0.92);
}
.chip.lv-high {
  border-color: rgba(245, 63, 63, 0.35);
  color: rgba(255, 180, 180, 0.92);
}

.chip.st-pending {
  border-color: rgba(255, 125, 0, 0.28);
  color: rgba(255, 210, 160, 0.92);
}
.chip.st-handling {
  border-color: rgba(32, 214, 255, 0.28);
  color: rgba(190, 240, 255, 0.92);
}
.chip.st-extinguished {
  border-color: rgba(0, 150, 136, 0.30);
  color: rgba(170, 255, 245, 0.92);
}

.chip.new-marker {
  border-color: rgba(200, 160, 255, 0.45);
  color: rgba(230, 210, 255, 0.95);
  background: rgba(138, 43, 226, 0.12);
}

.main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.meta,
.time {
  color: rgba(190, 220, 235, 0.72);
  font-size: 12px;
  white-space: nowrap;
}

.loc {
  font-weight: 850;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

