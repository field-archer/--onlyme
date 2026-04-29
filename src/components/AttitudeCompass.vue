<template>
  <div class="compass" role="img" aria-label="姿态罗盘">
    <div class="ring">
      <div class="ticks" aria-hidden="true"></div>
      <div class="labels" aria-hidden="true">
        <div class="lab n">N</div>
        <div class="lab e">E</div>
        <div class="lab s">S</div>
        <div class="lab w">W</div>
      </div>
      <div class="needle" aria-hidden="true"></div>
      <div class="bubble" :style="bubbleStyle" aria-hidden="true"></div>
      <div class="center" aria-hidden="true"></div>
    </div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-lab">ROLL</div>
        <div class="meta-val">{{ roll.toFixed(0) }}°</div>
      </div>
      <div class="meta-item">
        <div class="meta-lab">PITCH</div>
        <div class="meta-val">{{ pitch.toFixed(0) }}°</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  roll: number;
  pitch: number;
}>();

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const roll = computed(() => (Number.isFinite(props.roll) ? props.roll : 0));
const pitch = computed(() => (Number.isFinite(props.pitch) ? props.pitch : 0));

/**
 * 简化渲染：
 * - 外圈固定，表示“罗盘”
 * - bubble 用 roll/pitch 映射为偏移（类似水平仪）
 */
const bubbleStyle = computed(() => {
  const maxDeg = 45;
  const r = clamp(roll.value, -maxDeg, maxDeg);
  const p = clamp(pitch.value, -maxDeg, maxDeg);

  // px offset inside ring
  const maxPx = 22;
  const x = (r / maxDeg) * maxPx; // roll -> x
  const y = (p / maxDeg) * maxPx; // pitch -> y

  return {
    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
  } as Record<string, string>;
});
</script>

<style scoped>
.compass {
  display: grid;
  gap: 10px;
}

.ring {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 1px solid rgba(38, 220, 255, 0.18);
  background: radial-gradient(closest-side, rgba(6, 14, 22, 0.30), rgba(6, 14, 22, 0.10));
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.08) inset, 0 20px 60px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.ticks {
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  background:
    conic-gradient(
      from 0deg,
      rgba(32, 214, 255, 0.00) 0deg 8deg,
      rgba(32, 214, 255, 0.16) 8deg 9deg,
      rgba(32, 214, 255, 0.00) 9deg 18deg
    );
  mask: radial-gradient(circle at center, transparent 0 62%, #000 64% 100%);
  opacity: 0.9;
}

.labels .lab {
  position: absolute;
  font-size: 11px;
  font-weight: 900;
  color: rgba(236, 246, 255, 0.90);
  text-shadow: 0 0 16px rgba(32, 214, 255, 0.18);
}
.labels .n { top: 8px; left: 50%; transform: translateX(-50%); }
.labels .s { bottom: 8px; left: 50%; transform: translateX(-50%); opacity: 0.78; }
.labels .e { right: 10px; top: 50%; transform: translateY(-50%); opacity: 0.78; }
.labels .w { left: 10px; top: 50%; transform: translateY(-50%); opacity: 0.78; }

.needle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 42%;
  transform: translate(-50%, -100%);
  background: linear-gradient(180deg, rgba(255, 77, 79, 0.95), rgba(255, 77, 79, 0.00));
  filter: drop-shadow(0 0 18px rgba(255, 77, 79, 0.22));
}

.bubble {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  transform: translate(0, 0);
  margin-left: -9px;
  margin-top: -9px;
  border: 1px solid rgba(0, 255, 168, 0.45);
  background: radial-gradient(circle at 30% 30%, rgba(0, 255, 168, 0.65), rgba(0, 255, 168, 0.10));
  box-shadow: 0 0 26px rgba(0, 255, 168, 0.12);
  transition: transform 120ms var(--ease);
}

.center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-left: -5px;
  margin-top: -5px;
  border: 1px solid rgba(38, 220, 255, 0.18);
  background: rgba(6, 14, 22, 0.35);
}

.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.meta-item {
  border-radius: 14px;
  border: 1px solid rgba(38, 220, 255, 0.12);
  background: rgba(6, 14, 22, 0.16);
  padding: 10px 10px 9px;
}

.meta-lab {
  font-size: 11px;
  color: rgba(190, 220, 235, 0.72);
}

.meta-val {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 900;
}
</style>

