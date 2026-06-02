import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/icon'

type Stats = {
  total_views: number
  total_users: number
  total_orders: number
  all_users: number
  views_by_day: { day: string; views: number }[]
  top_pages: { path: string; views: number }[]
  traffic_sources: { source: string; visits: number }[]
  registrations_by_day: { day: string; count: number }[]
  orders_by_day: { day: string; count: number }[]
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Главная',
  '/auth': 'Вход / Регистрация',
  '/dashboard': 'Кабинет клиента',
  '/admin': 'Админ-панель',
  '/admin/analytics': 'Аналитика',
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-muted rounded-full h-2 mt-1">
      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function SparkLine({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 200
  const h = 50
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export default function AnalyticsPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user && user.role !== 'admin') navigate('/dashboard')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user?.role === 'admin') {
      api.analytics.getStats()
        .then(data => setStats(data.error ? null : data))
        .finally(() => setFetching(false))
    }
  }, [user])

  const handleLogout = async () => { await logout(); navigate('/') }

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/"><Logo /></a>
            <Badge variant="default" className="text-xs">Админ</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">← Заказы</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>Выйти</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground mt-1">Данные за последние 30 дней</p>
        </div>

        {!stats ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        ) : (
          <>
            {/* Итоговые цифры */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Просмотров', value: stats.total_views, icon: 'Eye' },
                { label: 'Регистраций', value: stats.total_users, icon: 'UserPlus' },
                { label: 'Заказов', value: stats.total_orders, icon: 'ShoppingBag' },
                { label: 'Всего клиентов', value: stats.all_users, icon: 'Users' },
              ].map(({ label, value, icon }) => (
                <Card key={label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <Icon name={icon as 'Eye'} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-3xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Просмотры по дням */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Просмотры страниц</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.views_by_day.length === 0
                    ? <p className="text-sm text-muted-foreground">Нет данных</p>
                    : <>
                        <SparkLine data={stats.views_by_day.map(d => d.views)} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{stats.views_by_day[0]?.day}</span>
                          <span>{stats.views_by_day[stats.views_by_day.length - 1]?.day}</span>
                        </div>
                      </>
                  }
                </CardContent>
              </Card>

              {/* Регистрации + заказы по дням */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Регистрации и заказы</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Регистрации</p>
                    {stats.registrations_by_day.length === 0
                      ? <p className="text-xs text-muted-foreground">Нет данных</p>
                      : <SparkLine data={stats.registrations_by_day.map(d => d.count)} color="hsl(var(--chart-2))" />
                    }
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Заказы</p>
                    {stats.orders_by_day.length === 0
                      ? <p className="text-xs text-muted-foreground">Нет данных</p>
                      : <SparkLine data={stats.orders_by_day.map(d => d.count)} color="hsl(var(--chart-3))" />
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Топ страниц */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Популярные страницы</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.top_pages.length === 0
                    ? <p className="text-sm text-muted-foreground">Нет данных</p>
                    : stats.top_pages.map((p, i) => {
                        const maxViews = stats.top_pages[0].views
                        return (
                          <div key={p.path}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground w-4">{i + 1}</span>
                                <span>{PAGE_LABELS[p.path] || p.path}</span>
                              </span>
                              <span className="font-semibold">{p.views}</span>
                            </div>
                            <MiniBar value={p.views} max={maxViews} />
                          </div>
                        )
                      })
                  }
                </CardContent>
              </Card>

              {/* Источники трафика */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Источники трафика</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.traffic_sources.length === 0
                    ? <p className="text-sm text-muted-foreground">Нет данных</p>
                    : stats.traffic_sources.map(s => {
                        const maxVisits = stats.traffic_sources[0].visits
                        return (
                          <div key={s.source}>
                            <div className="flex items-center justify-between text-sm">
                              <span>{s.source}</span>
                              <span className="font-semibold">{s.visits}</span>
                            </div>
                            <MiniBar value={s.visits} max={maxVisits} />
                          </div>
                        )
                      })
                  }
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
