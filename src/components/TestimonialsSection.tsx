import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

const testimonials = [
  {
    quote:
      "Заказывал питч-дек для встречи с инвесторами. Сделали за 2 дня, качество выше всяких ожиданий. Инвесторы отметили презентацию отдельно — сказали, что редко видят такой уровень.",
    name: "Алексей",
    role: "Основатель стартапа",
  },
  {
    quote:
      "Нужен был бизнес-план для банка — сжатые сроки, много требований. Ребята разобрались быстро, сделали всё чётко и в срок. Кредит одобрили с первого раза.",
    name: "Марина",
    role: "Предприниматель",
  },
  {
    quote:
      "Обратился с корпоративной презентацией на 50 слайдов. Результат просто огонь — коллеги на конференции спрашивали, кто делал дизайн. Обязательно вернусь.",
    name: "Дмитрий",
    role: "Директор по развитию",
  },
  {
    quote:
      "Делал маркетинг-кит для агентства. Всё в фирменном стиле, правки вносили быстро и без лишних вопросов. Теперь используем материалы на каждой встрече с клиентами.",
    name: "Ольга",
    role: "Руководитель агентства",
  },
]

export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationFrameId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5

    const scroll = () => {
      scrollPosition += scrollSpeed

      if (scrollContainer.scrollWidth && scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }

      scrollContainer.scrollLeft = scrollPosition
      animationFrameId = requestAnimationFrame(scroll)
    }

    animationFrameId = requestAnimationFrame(scroll)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
          Что говорят наши клиенты
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed">
          Нам важен результат — не просто красивые слайды, а проекты, которые помогают выигрывать переговоры и получать финансирование.
        </p>

        <div className="relative">
          <div ref={scrollRef} className="flex gap-6 overflow-x-hidden" style={{ scrollBehavior: "auto" }}>
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <Card key={index} className="flex-shrink-0 w-[90vw] sm:w-[450px] border-none shadow-lg">
                <CardContent className="p-8">
                  <Quote className="h-8 w-8 text-primary mb-4" />
                  <p className="text-base sm:text-lg mb-6 leading-relaxed text-pretty min-h-[120px]">
                    {testimonial.quote}
                  </p>
                  <div>
                    <p className="font-semibold text-lg">{testimonial.name}</p>
                    <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
