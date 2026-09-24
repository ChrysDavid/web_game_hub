import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { unlockSounds } from './services/sound'

// Le son n'est autorise qu'apres un geste : on l'active au premier toucher, puis on essaie tout de
// suite (la WebView de l'app autorise deja la lecture sans geste).
window.addEventListener('pointerdown', unlockSounds, { once: true })
unlockSounds()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
