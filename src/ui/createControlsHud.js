export function createControlsHud(soundManager) {
    const element = document.createElement('div');
    element.className = 'game-controls-hud';

    element.innerHTML = `
        <div class="game-controls-heading">CONTROLS</div>

        <div class="game-control"><kbd>W A S D</kbd><span>Move</span></div>
        <div class="game-control"><kbd>SHIFT</kbd><span>Run</span></div>
        <div class="game-control"><kbd>ALT + SHIFT</kbd><span>Sneak</span></div>
        <div class="game-control"><kbd>MOUSE</kbd><span>Look around</span></div>
        <div class="game-control"><kbd>E</kbd><span>Interact</span></div>
        <div class="game-control"><kbd>F</kbd><span>Focus</span></div>
        <div class="game-control"><kbd>L</kbd><span>Lantern</span></div>
        <div class="game-control"><kbd>N</kbd><span>Night vision</span></div>

        <div class="game-control game-control--mute">
            <button class="mute-key" type="button">M</button>
            <span class="mute-label">Mute sound</span>
        </div>
    `;

    document.body.appendChild(element);

    const muteButton = element.querySelector('.mute-key');
    const muteLabel = element.querySelector('.mute-label');

    let muted = false;
    let previousVolume = soundManager.masterVolume;

    function toggleMute() {
        if (muted) {
            soundManager.setMasterVolume(previousVolume);
        } else {
            previousVolume = soundManager.masterVolume;
            soundManager.setMasterVolume(0);
        }

        muted = !muted;

        muteButton.classList.toggle('is-muted', muted);
        muteLabel.textContent = muted ? 'Sound off' : 'Mute sound';
    }

    function onKeyDown(event) {
        if (
            event.code === 'KeyM' &&
            !event.repeat &&
            !(event.target instanceof HTMLInputElement) &&
            !(event.target instanceof HTMLTextAreaElement)
        ) {
            toggleMute();
        }
    }

    muteButton.addEventListener('click', toggleMute);
    window.addEventListener('keydown', onKeyDown);

    return {
        setVisible(visible) {
            element.style.display = visible ? 'flex' : 'none';
        },

        dispose() {
            window.removeEventListener('keydown', onKeyDown);
            element.remove();
        },
    };
}
