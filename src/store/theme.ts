import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useTheme = create<ThemeState>((set) => {
  // Check local storage or default to light
  const stored = localStorage.getItem('theme')
  const initialIsDark = stored === 'dark'
  
  // Set initial class
  if (initialIsDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  return {
    isDark: initialIsDark,
    toggle: () => set((state) => {
      const next = !state.isDark
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return { isDark: next }
    }),
  }
})
