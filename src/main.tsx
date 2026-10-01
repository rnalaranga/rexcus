import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { DialogProvider } from '@/components/ui/DialogProvider'

// Initial theme setup (prevent FOUC)
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>,
)
