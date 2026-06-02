import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Icon from '@/components/ui/icon'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'Новый', variant: 'secondary' },
  in_progress: { label: 'В работе', variant: 'default' },
  review: { label: 'На проверке', variant: 'outline' },
  done: { label: 'Готово', variant: 'default' },
}

type Order = {
  id: number; title: string; description: string; status: string
  file_url: string | null; created_at: string; client_name: string; client_email: string
}
type Message = { id: number; text: string; created_at: string; sender_name: string; sender_role: string }

export default function AdminPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [showFileInput, setShowFileInput] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user && user.role !== 'admin') navigate('/dashboard')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) api.orders.list().then(data => setOrders(Array.isArray(data) ? data : []))
  }, [user])

  useEffect(() => {
    if (selectedOrder) api.chat.messages(selectedOrder.id).then(data => setMessages(Array.isArray(data) ? data : []))
  }, [selectedOrder])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleStatus = async (id: number, status: string) => {
    await api.orders.setStatus(id, status)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : prev)
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder || !fileUrl.trim()) return
    await api.orders.setFile(selectedOrder.id, fileUrl)
    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, file_url: fileUrl } : o))
    setSelectedOrder(prev => prev ? { ...prev, file_url: fileUrl } : prev)
    setFileUrl(''); setShowFileInput(false)
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
          <div className="flex items-center gap-3">
            <a href="/"><Logo /></a>
            <Badge variant="default" className="text-xs">Админ</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>Выйти</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Панель управления</h1>
          <p className="text-muted-foreground mt-1">Всего заказов: {orders.length}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {orders.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Icon name="Inbox" className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Заказов пока нет</p>
                </CardContent>
              </Card>
            )}
            {orders.map(order => {
              const s = STATUS_LABELS[order.status] || { label: order.status, variant: 'secondary' as const }
              return (
                <Card
                  key={order.id}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedOrder?.id === order.id ? 'border-primary' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{order.title}</p>
                        <p className="text-xs text-muted-foreground">{order.client_name} · {order.client_email}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ru')}</p>
                      </div>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <Select value={order.status} onValueChange={v => { handleStatus(order.id, v); }}>
                      <SelectTrigger className="h-8 text-xs" onClick={e => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Новый</SelectItem>
                        <SelectItem value="in_progress">В работе</SelectItem>
                        <SelectItem value="review">На проверке</SelectItem>
                        <SelectItem value="done">Готово</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="space-y-4">
            {selectedOrder ? (
              <>
                <Card className="h-[420px] flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base truncate">Чат: {selectedOrder.title}</CardTitle>
                  </CardHeader>
                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm mt-8">Сообщений пока нет</p>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender_role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {msg.sender_role !== 'admin' && <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>}
                          <p>{msg.text}</p>
                          <p className="text-xs mt-1 opacity-60">{new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMsg} className="p-3 border-t flex gap-2">
                    <Input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Ответить клиенту..." className="flex-1" />
                    <Button type="submit" size="icon"><Icon name="Send" className="h-4 w-4" /></Button>
                  </form>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">Готовый файл</p>
                      <Button size="sm" variant="outline" onClick={() => setShowFileInput(v => !v)}>
                        <Icon name="Upload" className="mr-1 h-3 w-3" />
                        {selectedOrder.file_url ? 'Обновить' : 'Загрузить'}
                      </Button>
                    </div>
                    {selectedOrder.file_url && (
                      <a href={selectedOrder.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline">
                        <Icon name="FileDown" className="h-4 w-4" /> Текущий файл
                      </a>
                    )}
                    {showFileInput && (
                      <form onSubmit={handleFileUpload} className="flex gap-2 mt-3">
                        <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="Ссылка на файл (Google Drive, etc)" className="flex-1" required />
                        <Button type="submit" size="sm">Сохранить</Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-[420px] flex items-center justify-center border-dashed">
                <p className="text-muted-foreground text-sm">Выберите заказ</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}