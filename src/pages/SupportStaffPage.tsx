import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Icon from '@/components/ui/icon'

type Ticket = { id: number; name: string; email: string; subject: string; status: string; created_at: string }
type Reply = { id: number; text: string; is_admin: boolean; created_at: string }

const TICKET_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Открыт', variant: 'secondary' },
  answered: { label: 'Отвечен', variant: 'default' },
  closed: { label: 'Закрыт', variant: 'outline' },
}

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'answered', label: 'Отвеченные' },
  { value: 'closed', label: 'Закрытые' },
]

export default function SupportStaffPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket & { message?: string } | null>(null)
  const [ticketReplies, setTicketReplies] = useState<Reply[]>([])
  const [replyText, setReplyText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user && user.role !== 'support' && user.role !== 'admin') navigate('/dashboard')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) loadTickets()
  }, [user, statusFilter])

  useEffect(() => {
    if (selectedTicket) {
      api.support.get(selectedTicket.id).then(data => {
        setTicketReplies(data.replies || [])
        if (data.ticket?.message) {
          setSelectedTicket(prev => prev ? { ...prev, message: data.ticket.message } : prev)
        }
      })
    }
  }, [selectedTicket?.id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [ticketReplies])

  const loadTickets = () => {
    api.support.list(statusFilter || undefined).then(data => setTickets(data.tickets || []))
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !replyText.trim()) return
    const res = await api.support.reply(selectedTicket.id, replyText)
    if (res.success) {
      setReplyText('')
      const data = await api.support.get(selectedTicket.id)
      setTicketReplies(data.replies || [])
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'answered' } : t))
      setSelectedTicket(prev => prev ? { ...prev, status: 'answered' } : prev)
    }
  }

  const handleTicketStatus = async (ticketId: number, status: string) => {
    await api.support.setStatus(ticketId, status)
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, status } : prev)
  }

  const handleLogout = async () => { await logout(); navigate('/') }

  const openCount = tickets.filter(t => t.status === 'open').length

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/"><Logo /></a>
            <Badge variant="secondary" className="text-xs">Поддержка</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Выйти</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Обращения в поддержку</h1>
            <p className="text-muted-foreground mt-1">
              {openCount > 0 ? <span className="text-primary font-medium">{openCount} новых</span> : 'Нет новых'} обращений
            </p>
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {tickets.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Icon name="Inbox" className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Обращений нет</p>
                </CardContent>
              </Card>
            )}
            {tickets.map(ticket => {
              const s = TICKET_STATUS[ticket.status] || { label: ticket.status, variant: 'secondary' as const }
              return (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer transition-all hover:border-primary ${selectedTicket?.id === ticket.id ? 'border-primary' : ''}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm">#{ticket.id} {ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.name} · {ticket.email}</p>
                        <p className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString('ru')}</p>
                      </div>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <Select value={ticket.status} onValueChange={v => handleTicketStatus(ticket.id, v)}>
                      <SelectTrigger className="h-8 text-xs" onClick={e => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Открыт</SelectItem>
                        <SelectItem value="answered">Отвечен</SelectItem>
                        <SelectItem value="closed">Закрыт</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div>
            {selectedTicket ? (
              <Card className="flex flex-col h-[580px]">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold truncate">
                    #{selectedTicket.id} {selectedTicket.subject}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedTicket.name} · {selectedTicket.email}</p>
                </CardHeader>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm">
                    <p className="text-xs font-semibold mb-1 opacity-70">{selectedTicket.name} (клиент)</p>
                    <p>{selectedTicket.message || '...'}</p>
                  </div>
                  {ticketReplies.map(reply => (
                    <div key={reply.id} className={`flex ${reply.is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${reply.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {!reply.is_admin && <p className="text-xs font-semibold mb-1 opacity-70">Клиент</p>}
                        <p>{reply.text}</p>
                        <p className="text-xs mt-1 opacity-60">{new Date(reply.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleReply} className="p-3 border-t flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Ответить на обращение..."
                    className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                    rows={1}
                  />
                  <Button type="submit" size="icon" className="self-end">
                    <Icon name="Send" className="h-4 w-4" />
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="h-[580px] flex items-center justify-center border-dashed">
                <div className="text-center text-muted-foreground">
                  <Icon name="MessageCircle" className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Выберите обращение</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
