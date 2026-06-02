import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import Icon from "@/components/ui/icon"

type Step = "form" | "success"

export default function SupportPage() {
  const [step, setStep] = useState<Step>("form")
  const [ticketId, setTicketId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await api.support.create(form)
      if (res.success) {
        setTicketId(res.ticket_id)
        setStep("success")
      } else {
        setError(res.error || "Ошибка при отправке")
      }
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <Icon name="ArrowLeft" size={16} />
          На главную
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {step === "form" ? (
            <Card className="border-none shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="HeadphonesIcon" size={24} className="text-primary" fallback="MessageCircle" />
                </div>
                <CardTitle className="text-2xl">Техническая поддержка</CardTitle>
                <p className="text-muted-foreground text-sm mt-2">
                  Опишите проблему — мы ответим как можно скорее
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Имя *</label>
                      <Input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ваше имя"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email *</label>
                      <Input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.ru"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Тема обращения *</label>
                    <Input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="Кратко опишите суть вопроса"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Сообщение *</label>
                    <Textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Подробно опишите проблему или вопрос..."
                      rows={5}
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <Icon name="AlertCircle" size={14} />
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Отправляем...</>
                    ) : (
                      <><Icon name="Send" size={16} className="mr-2" />Отправить обращение</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-xl text-center">
              <CardContent className="pt-12 pb-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Icon name="CheckCircle2" size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Обращение принято!</h2>
                  <p className="text-muted-foreground">
                    Ваш номер обращения: <span className="font-bold text-foreground">#{ticketId}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Сохраните этот номер — по нему можно отслеживать статус ответа.
                    Мы свяжемся с вами на указанный email.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" onClick={() => { setStep("form"); setForm({ name: "", email: "", subject: "", message: "" }) }}>
                    Новое обращение
                  </Button>
                  <Button asChild>
                    <a href="/">На главную</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
