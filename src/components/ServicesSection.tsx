import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Icon from "@/components/ui/icon"

const services = [
  {
    icon: "Monitor",
    title: "Презентации",
    description:
      "Создаём продающие презентации для бизнеса, инвесторов и конференций. Стильный дизайн, убедительная структура и чёткий message — всё, чтобы ваша идея произвела нужное впечатление.",
  },
  {
    icon: "FileText",
    title: "Бизнес-планы",
    description:
      "Разрабатываем подробные бизнес-планы с финансовыми моделями, анализом рынка и стратегией роста. Подходит для банков, инвесторов и собственного планирования.",
  },
  {
    icon: "TrendingUp",
    title: "Питч-деки",
    description:
      "Готовим питч-деки для стартапов и растущих компаний. Помогаем структурировать историю, выделить главное и убедить инвестора с первого слайда.",
  },
  {
    icon: "BarChart2",
    title: "Аналитические отчёты",
    description:
      "Превращаем сложные данные в понятные визуальные отчёты. Графики, инфографика, дашборды — всё для того, чтобы ваша аналитика говорила сама за себя.",
  },
  {
    icon: "BookOpen",
    title: "Учебные материалы",
    description:
      "Разрабатываем курсы, обучающие презентации, методички и дидактические материалы. Подходит для образовательных платформ, корпоративного обучения и тренингов.",
  },
  {
    icon: "Sparkles",
    title: "Нестандартные форматы",
    description:
      "Берёмся за проекты любой сложности: коммерческие предложения, маркетинг-киты, портфолио, white paper, тендерная документация. Если нужен результат — мы справимся.",
  },
  {
    icon: "Globe",
    title: "Разработка сайтов",
    description:
      "Разрабатываем сайты любой сложности: лендинги, корпоративные сайты, интернет-магазины. Современный дизайн, быстрая загрузка и удобное управление. От 6 000 р.",
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mx-auto block w-fit">
          Что мы делаем
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
          В чем мы <span className="text-primary">сильны</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed text-lg">
          От простой презентации до сложного инвестиционного проекта — берёмся за любые задачи и доводим до результата.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="group hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-background/50 backdrop-blur-sm"
            >
              <CardHeader>
                <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Icon name={service.icon} className="h-6 w-6" fallback="Star" />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}