export class Sizes {
    constructor() {
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)
        this.listeners = []

        window.addEventListener('resize', () => {
            this.width = window.innerWidth
            this.height = window.innerHeight
            this.pixelRatio = Math.min(window.devicePixelRatio, 2)

            this.listeners.forEach((listener) => listener())
        })
    }

    onResize(listener) {
        this.listeners.push(listener)
    }
}