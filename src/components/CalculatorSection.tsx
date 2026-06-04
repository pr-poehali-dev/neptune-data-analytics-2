import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { QuoteFormDialog } from "@/components/QuoteFormDialog"
import Icon from "@/components/ui/icon"

const SERVICE_TYPES = [
  { id: "presentation", label: "Презентация", icon: "Monitor", basePrice: 600 },
  { id: "pitch", label: "Питч-дек", icon: "TrendingUp", basePrice: 1500 },
  { id: "bizplan", label: "Бизнес-план", icon: "FileText", basePrice: 3000 },
  { id: "report", label: "Аналитический отчёт", icon: "BarChart2", basePrice: 2000 },
  { id: "site", label: "Сайт", icon: "Globe", basePrice: 6000 },
]

const SLIDES_OPTIONS = [
  { id: "s1", label: "До 10", multiplier: 1 },
  { id: "s2", label: "10–20", multiplier: 1.5 },
  { id: "s3", label: "20–40", multiplier: 2.2 },
  { id: "s4", label: "40+", multiplier: 3 },
]

const URGENCY_OPTIONS = [
  { id: "u1", label: "Стандарт", sub: "3–5 дней", multiplier: 1 },
  { id: "u2", label: "Срочно", sub: "1–2 дня", multiplier: 1.5 },
  { id: "u3", label: "Супер-срочно", sub: "до 24 часов", multiplier: 2 },
]

const EXTRAS = [
  { id: "e1", label: "Анимации и переходы", price: 800 },
  { id: "e2", label: "Инфографика и графики", price: 600 },
  { id: "e3", label: "Финансовая модель", price: 1500 },
  { id: "e4", label: "Фирменный стиль", price: 1000 },
]

export function CalculatorSection() {
  const [service, setService] = useState(SERVICE_TYPES[0])
  const [slides, setSlides] = useState(SLIDES_OPTIONS[0])
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0])
  const [extras, setExtras] = useState<string[]>([])

  const toggleExtra = (id: string) =>
    setExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])

  const extrasTotal = EXTRAS.filter(e => extras.includes(e.id)).reduce((sum, e) => sum + e.price, 0)
  const base = service.id === "site" ? service.basePrice : Math.round(service.basePrice * slides.multiplier)
  const total = Math.round(base * urgency.multiplier) + extrasTotal

  const isSlides = service.id !== "site" && service.id !== "bizplan"

  return (
    <section id="calculator" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Icon name="Calculator" size={14} />
            Быстрый расчёт
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-balance">
            Сколько стоит <span className="text-primary">ваш проект?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Настройте параметры и узнайте примерную стоимость за 30 секунд
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Тип услуги */}
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Тип услуги</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setService(s)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        service.id === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <Icon name={s.icon} size={16} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Объём */}
            {isSlides && (
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Количество слайдов</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SLIDES_OPTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSlides(s)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          slides.id === s.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Срочность */}
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Срочность</p>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_OPTIONS.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setUrgency(u)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${
                        urgency.id === u.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <span>{u.label}</span>
                      <span className={`text-xs ${urgency.id === u.id ? "text-primary/70" : "text-muted-foreground"}`}>{u.sub}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Дополнения */}
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Дополнительно</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTRAS.map(e => (
                    <button
                      key={e.id}
                      onClick={() => toggleExtra(e.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        extras.includes(e.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${extras.includes(e.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                          {extras.includes(e.id) && <Icon name="Check" size={10} className="text-primary-foreground" />}
                        </div>
                        {e.label}
                      </span>
                      <span className="font-medium">+{e.price.toLocaleString()} ₽</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Итог */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border-primary/30 shadow-xl shadow-primary/5">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Итоговая стоимость</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-primary">{total.toLocaleString()}</span>
                      <span className="text-xl font-medium mb-0.5">₽</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Окончательная цена — после обсуждения деталей</p>
                  </div>

                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{service.label}{isSlides ? `, ${slides.label} сл.` : ""}</span>
                      <span>{base.toLocaleString()} ₽</span>
                    </div>
                    {urgency.id !== "u1" && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Срочность ×{urgency.multiplier}</span>
                        <span>+{(Math.round(base * urgency.multiplier) - base).toLocaleString()} ₽</span>
                      </div>
                    )}
                    {extras.map(id => {
                      const ex = EXTRAS.find(e => e.id === id)
                      return ex ? (
                        <div key={id} className="flex justify-between text-muted-foreground">
                          <span>{ex.label}</span>
                          <span>+{ex.price.toLocaleString()} ₽</span>
                        </div>
                      ) : null
                    })}
                  </div>

                  <QuoteFormDialog packageName={service.label} variant="default" className="w-full">
                    Заказать за {total.toLocaleString()} ₽
                  </QuoteFormDialog>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="ShieldCheck" size={14} className="text-primary shrink-0" />
                    Бесплатная консультация перед оплатой
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
