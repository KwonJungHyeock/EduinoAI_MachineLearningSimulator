// [기기 연결] 버튼 → Web Serial 연결. 실패해도 시뮬 모드로 계속.
export function wireConnect(button, serial, hud) {
  if (!serial.supported) {
    button.textContent = '시뮬 전용';
    button.disabled = true;
    button.title = 'Web Serial 미지원 브라우저 (Chrome/Edge 데스크톱 권장)';
  }
  serial.onState((connected) => {
    hud.setConnection(connected);
    button.textContent = connected ? '연결됨 ●' : '기기 연결';
  });
  button.addEventListener('click', async () => {
    if (serial.connected) {
      await serial.disconnect();
      return;
    }
    try {
      await serial.connect();
      hud.toast('ESP32 연결됨 — 실물 센서/출력 활성', '#3ddc91');
    } catch (e) {
      hud.toast('연결 실패: ' + (e?.message || e) + ' (시뮬 계속)', '#ff5a3c');
    }
  });
}
