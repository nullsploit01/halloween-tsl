export class GameOverScreen {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'game-over-screen';

        this.element.innerHTML = `
            <main class="ending-content">

                <div class="ending-label">
                    L O R N
                    <span> / FINAL TRANSMISSION</span>
                </div>

                <h1 class="ending-title">GAME OVER</h1>

                <div class="ending-line"></div>

                <p class="ending-message">
                    No one can escape this hotel.
                </p>

                <button class="ending-credits" type="button">
                    <span>VIEW CREDITS</span>
                    <span class="ending-arrow">↗</span>
                    <button class="ending-restart" type="button">
                        PLAY AGAIN
                    </button>
                </button>

            </main>

            <footer class="ending-footer">
                <div>
                    CREATED BY
                    <a
                        href="https://github.com/nullsploit01"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="creator-link"
                    >NULLSPLOIT ↗</a>
                </div>

                <a
                    href="https://github.com/nullsploit01/halloween-tsl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="source-link"
                >
                    VIEW SOURCE CODE ↗
                </a>

                <div class="copyright">
                © <span class="current-year"></span> NULLSPLOIT. ALL RIGHTS RESERVED.
                </div>
            </footer>

            <section class="credits-overlay">
                <div class="credits-content">

                    <div class="credits-label">LORN / CREDITS</div>
                    <h2>CREDITS</h2>
                    <div class="ending-line"></div>

                    <div class="credits-role">GAME DESIGN & DEVELOPMENT</div>
                    <h3>NULLSPLOIT</h3>

                    <p>
                        Thank you for playing.<br>
                        Some places are better left unexplored.
                    </p>

                    <div class="credits-divider"></div>

                    <div class="credits-role">3D MODELS</div>

                    <div class="credit-item">
                        <a href="https://skfb.ly/6WoNX" target="_blank" rel="noopener noreferrer">
                            Lantern
                        </a>
                        <span>by Mandrake</span>
                        <small>CC BY 4.0</small>
                    </div>

                    <div class="credit-item">
                        <a href="https://skfb.ly/opDuK" target="_blank" rel="noopener noreferrer">
                            EVIL NUN DEADLE NIGHTMARE MOD
                        </a>
                        <span>by Dark Phantom Thunderball</span>
                        <small>CC BY 4.0</small>
                    </div>

                    <div class="credit-item">
                        <a href="https://skfb.ly/pH8x6" target="_blank" rel="noopener noreferrer">
                            Creep
                        </a>
                        <span>by 🌎 Ꮆㄒ🌎 🌿</span>
                        <small>CC BY 4.0</small>
                    </div>

                    <div class="credit-item">
                        <a href="https://skfb.ly/oSVY8" target="_blank" rel="noopener noreferrer">
                            Outlast Camera
                        </a>
                        <span>by ~Drift~</span>
                        <small>CC BY 4.0</small>
                    </div>

                    <div class="credits-divider"></div>

                    <div class="credits-role">TEXTURES</div>
                    <div class="credit-item">
                        <a href="https://polyhaven.com/textures" target="_blank" rel="noopener noreferrer">
                            Poly Haven
                        </a>
                        <span>Texture assets</span>
                    </div>

                    <div class="credits-divider"></div>

                    <div class="credits-role">SOUND EFFECTS</div>
                    <div class="credit-item">
                        <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer">
                            Pixabay
                        </a>
                        <span>Sound assets</span>
                    </div>

                    <button class="credits-close" type="button">
                        BACK
                    </button>

                </div>
            </section>
        `;

        document.body.appendChild(this.element);

        this.creditsOverlay = this.element.querySelector('.credits-overlay');

        this.element.querySelector('.ending-credits').addEventListener('click', () => {
            this.creditsOverlay.classList.add('is-visible');
        });

        this.element.querySelector('.credits-close').addEventListener('click', () => {
            this.creditsOverlay.classList.remove('is-visible');
        });

        const restartButton = this.element.querySelector('.ending-restart');

        if (!restartButton) {
            throw new Error('Game Over buttons could not be found.');
        }

        restartButton.addEventListener('click', () => {
            window.location.reload();
        });

        this.element.querySelector('.current-year').textContent = new Date().getFullYear();

        this.visible = false;
    }

    show() {
        if (this.visible) return;

        this.visible = true;
        this.element.classList.add('is-visible');
    }

    hide() {
        this.visible = false;
        this.element.classList.remove('is-visible');
        this.creditsOverlay.classList.remove('is-visible');
    }

    dispose() {
        this.element.remove();
    }
}
