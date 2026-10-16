import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { readSessionStored, writeSessionStored } from './lib/storage'

/**
 * Each deploy renames the lazily loaded files, so a tab opened before a deploy
 * asks for files that no longer exist. Reloading picks up the new version.
 * Once per minute at most, so a file that is truly missing cannot loop.
 */
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(readSessionStored('icaur-reloaded-for-update') ?? 0)
  if (Date.now() - last < 60_000) return
  writeSessionStored('icaur-reloaded-for-update', String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
