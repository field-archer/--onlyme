<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

:root {
  color-scheme: dark;
  --bg-0: #060b12;
  --bg-1: #071424;
  --panel: rgba(10, 24, 38, 0.74);
  --panel-2: rgba(9, 18, 28, 0.82);
  --stroke: rgba(38, 220, 255, 0.28);
  --stroke-strong: rgba(38, 220, 255, 0.55);
  --text: rgba(236, 246, 255, 0.92);
  --muted: rgba(190, 220, 235, 0.72);
  --brand: #20d6ff;
  --brand-2: #00ffa8;
  --danger: #ff4d4f;
  --warning: #ffb020;
  --success: #2dd4bf;
  --shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  --glow: 0 0 0 1px rgba(32, 214, 255, 0.25), 0 0 42px rgba(32, 214, 255, 0.18);
  --radius-xl: 18px;
  --radius-lg: 14px;
  --radius-md: 10px;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}

body {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
    "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: radial-gradient(1000px 520px at 50% -12%, rgba(32, 214, 255, 0.24), transparent 60%),
    radial-gradient(820px 520px at 12% 12%, rgba(0, 255, 168, 0.10), transparent 62%),
    radial-gradient(900px 560px at 92% 18%, rgba(32, 214, 255, 0.12), transparent 60%),
    linear-gradient(180deg, var(--bg-0), var(--bg-1));
  color: var(--text);
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}

button {
  font-family: inherit;
}
</style>