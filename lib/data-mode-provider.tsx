'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type DataMode = 'demo' | 'api'

type DataModeContextValue = {
  mode: DataMode
  setMode: (mode: DataMode) => void
  toggleMode: () => void
}

const DataModeContext = createContext<DataModeContextValue | null>(null)
const MODE_KEY = 'fleet-data-mode'

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DataMode>('demo')

  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY)
    if (storedMode === 'demo' || storedMode === 'api') setModeState(storedMode)
  }, [])

  function setMode(nextMode: DataMode) {
    setModeState(nextMode)
    localStorage.setItem(MODE_KEY, nextMode)
  }

  function toggleMode() {
    setMode(mode === 'demo' ? 'api' : 'demo')
  }

  return (
    <DataModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </DataModeContext.Provider>
  )
}

export function useDataMode() {
  const context = useContext(DataModeContext)
  if (!context) throw new Error('useDataMode must be used inside DataModeProvider')
  return context
}
