import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

export function usePageTracker() {
  const location = useLocation()

  useEffect(() => {
    api.analytics.track(location.pathname)
  }, [location.pathname])
}
