/**
 * Lien avec l'app mobile VIDO LOVE.
 *
 * L'app ouvre un jeu dans une WebView avec deux parametres d'URL :
 * - `ticket` : ticket de jeu court, delivre par le backend a la personne connectee ;
 * - `ws` : adresse WebSocket du backend (ex: ws://192.168.1.10:8000).
 *
 * Avec ces deux parametres, le jeu se joue contre de vraies personnes. Sans eux (site ouvert
 * directement dans un navigateur), le jeu se joue contre l'ordinateur.
 */

export interface AppSession {
  ticket: string
  wsBase: string
}

export function getAppSession(search: string = window.location.search): AppSession | null {
  const params = new URLSearchParams(search)
  const ticket = params.get('ticket')
  const wsBase = params.get('ws')
  if (!ticket || !wsBase || !/^wss?:\/\//.test(wsBase)) return null
  return { ticket, wsBase: wsBase.replace(/\/+$/, '') }
}

type AppMessage = 'close' | 'replay'

interface FlutterChannel {
  postMessage: (message: string) => void
}

/** Previent l'app (canal JavaScript `VidoLoveApp` de la WebView). Sans app, ne fait rien. */
export function notifyApp(message: AppMessage) {
  const channel = (window as unknown as { VidoLoveApp?: FlutterChannel }).VidoLoveApp
  channel?.postMessage(message)
}
