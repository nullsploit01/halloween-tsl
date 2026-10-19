export function createCameraHud({ battery = 100, batteryDrainPerSecond = 0.4 } = {}) {
  const element = document.createElement('div');

  element.className = 'camera-hud';
  element.innerHTML = `
        <div class="camera-hud__top">
            <div class="camera-hud__status">
                <span class="camera-hud__rec">
                    <i></i> REC
                </span>

                <span class="camera-hud__clock">00:00</span>
            </div>
        </div>

        <div class="camera-hud__bottom">
            <span class="camera-hud__battery">BAT 100%</span>
        </div>
    `;

  document.body.append(element);

  const clockElement = element.querySelector('.camera-hud__clock');
  const batteryElement = element.querySelector('.camera-hud__battery');

  let elapsedSeconds = 0;
  let currentBattery = battery;
  let visible = false;

  return {
    setVisible(enabled) {
      visible = enabled;
      element.classList.toggle('is-visible', enabled);
    },

    update(deltaTime) {
      if (!visible) return;

      const now = new Date();

      clockElement.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      elapsedSeconds += deltaTime;
      currentBattery = Math.max(0, currentBattery - batteryDrainPerSecond * deltaTime);

      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = Math.floor(elapsedSeconds % 60);

      clockElement.textContent =
        `${String(minutes).padStart(2, '0')}:` + String(seconds).padStart(2, '0');

      batteryElement.textContent = `BAT ${Math.ceil(currentBattery)}%`;
    },

    setBatteryDrainPerSecond(value) {
      batteryDrainPerSecond = Math.max(0, value);
    },

    get battery() {
      return currentBattery;
    },
  };
}
