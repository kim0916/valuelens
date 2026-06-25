// ValueLens — 디바이스 ID 유틸리티
// Phase 1-E: main.jsx에서 분리

function getOrCreateDeviceId() {
  try {
    const key = 'valuelens_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(key, id);
    }
    return id;
  } catch { return 'dev_unknown'; }
}

export { getOrCreateDeviceId };
