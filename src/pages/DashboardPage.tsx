import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/icon'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'Новый', variant: 'secondary' },
  in_progress: { label: 'В работе', variant: 'default' },
  review: { label: 'На проверке', variant: 'outline' },
  done: { label: 'Готово', variant: 'default' },
}

type Order = {
  id: number; title: string; description: string; status: string
  file_url: string | null; created_at: string; updated_at: string
}
type Message = { id: number; text: string; created_at: string; sender_name: string; sender_role: string }

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [tab, setTab] = useState<'orders' | 'chat'>('orders')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user?.role === 'admin') navigate('/admin')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) api.orders.list().then(data => setOrders(Array.isArray(data) ? data : []))
  }, [user])

  useEffect(() => {
    if (selectedOrder) {
      api.chat.messages(selectedOrder.id).then(data => setMessages(Array.isArray(data) ? data : []))
    }
  }, [selectedOrder])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const order = await api.orders.create({ title: newTitle, description: newDesc })
    if (!order.error) {
      setOrders(prev => [order, ...prev])
      setNewTitle(''); setNewDesc(''); setShowNewForm(false)
    }
  }

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder || !msgText.trim()) return
    const msg = await api.chat.send(selectedOrder.id, msgText)
    if (!msg.error) { setMessages(prev => [...prev, msg]); setMsgText('') }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/"><Logo /></a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">Привет, {user?.name}!</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Выйти</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Мои заказы</h1>
            <p className="text-muted-foreground mt-1">Отслеживайте статус и общайтесь с исполнителем</p>
          </div>
          <Button onClick={() => setShowNewForm(v => !v)}>
            <Icon name="Plus" className="mr-2 h-4 w-4" />
            Новый заказ
          </Button>
        </div>

        {showNewForm && (
          <Card className="mb-6 border-primary/30">
            <CardHeader><CardTitle className="text-lg">Создать заказ</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название заказа" required />
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Описание: тип презентации, количество слайдов, пожелания..." rows={3} />
                <div className="flex gap-2">
                  <Button type="submit">Создать</Button>
                  <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>Отмена</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {orders.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Icon name="FileText" className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>У вас пока нет заказов</p>
                  <Button className="mt-4" variant="outline" onClick={() => setShowNewForm(true)}>Создать первый заказ</Button>
                </CardContent>
              </Card>
            )}
            {orders.map(order => {
              const s = STATUS_LABELS[order.status] || { label: order.status, variant: 'secondary' as const }
              return (
                <Card
                  key={order.id}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedOrder?.id === order.id ? 'border-primary' : ''}`}
                  onClick={() => { setSelectedOrder(order); setTab('chat') }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{order.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString('ru')}</p>
                      </div>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    {order.file_url && (
                      <a href={order.file_url} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={e => e.stopPropagation()}>
                        <Icon name="Download" className="h-3 w-3" /> Скачать файл
                      </a>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div>
            {selectedOrder ? (
              <Card className="h-[500px] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base truncate">{selectedOrder.title}</CardTitle>
                </CardHeader>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm mt-8">Сообщений пока нет. Напишите первым!</p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender_role === 'admin' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        {msg.sender_role === 'admin' && <p className="text-xs font-semibold mb-1 opacity-70">Исполнитель</p>}
                        <p>{msg.text}</p>
                        <p className={`text-xs mt-1 opacity-60`}>{new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMsg} className="p-3 border-t flex gap-2">
                  <Input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Сообщение..." className="flex-1" />
                  <Button type="submit" size="icon"><Icon name="Send" className="h-4 w-4" /></Button>
                </form>
              </Card>
            ) : (
              <Card className="h-[500px] flex items-center justify-center border-dashed">
                <p className="text-muted-foreground text-sm">Выберите заказ для чата</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}