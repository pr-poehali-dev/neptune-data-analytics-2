import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Send, CheckCircle, Loader2 } from "lucide-react"

const SEND_CONTACT_URL = "https://functions.poehali.dev/36c27d43-6516-4fc7-92d8-36b5847cd220"

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch(SEND_CONTACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setStatus("success")
        setFormData({ name: "", email: "", phone: "", message: "" })
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            Контакты
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">
            Давайте <span className="text-primary">обсудим проект</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Опишите задачу — и мы предложим решение, сроки и стоимость. Консультация бесплатна и ни к чему не обязывает.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-xl bg-background">
              <CardHeader>
                <CardTitle className="text-2xl">Напишите нам</CardTitle>
              </CardHeader>
              <CardContent>
                {status === "success" ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <CheckCircle className="h-16 w-16 text-primary" />
                    <h3 className="text-2xl font-bold">Заявка отправлена!</h3>
                    <p className="text-muted-foreground">Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>
                    <Button variant="outline" onClick={() => setStatus("idle")}>Отправить ещё</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Имя *</label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ваше имя"
                          required
                          disabled={status === "loading"}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">E-mail *</label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your@email.ru"
                          required
                          disabled={status === "loading"}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium">Телефон</label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+7 900 123-45-67"
                        disabled={status === "loading"}
                        className="transition-all focus:scale-[1.02]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">Сообщение *</label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Опишите задачу: тип проекта, объём, сроки, особые требования..."
                        rows={6}
                        required
                        disabled={status === "loading"}
                        className="transition-all focus:scale-[1.02]"
                      />
                    </div>
                    {status === "error" && (
                      <p className="text-sm text-destructive">Ошибка отправки. Попробуйте ещё раз или напишите напрямую на почту.</p>
                    )}
                    <Button type="submit" size="lg" className="w-full sm:w-auto group" disabled={status === "loading"}>
                      {status === "loading" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Отправляем...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />Отправить</>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">E-mail</h3>
                    <a href="mailto:egorkrivolap@yandex.ru" className="text-sm text-muted-foreground hover:text-primary transition-colors">egorkrivolap@yandex.ru</a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Телефон / Макс</h3>
                    <a href="tel:+79183538317" className="text-sm text-muted-foreground hover:text-primary transition-colors">+7 918 353-83-17</a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Время работы</h3>
                    <p className="text-sm text-muted-foreground">
                      Пн - Пт: 9:00 - 18:00
                      <br />
                      Выходные: по договоренности
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}