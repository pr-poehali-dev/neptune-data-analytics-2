import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Icon from "@/components/ui/icon"

const projects = [
  {
    title: "Питч-дек для IT-стартапа",
    category: "Инвестиционная презентация",
    image: "/creative-portfolio-website.png",
    description:
      "20-слайдовый питч-дек для привлечения раунда A. Включает анализ рынка, финансовую модель, roadmap и описание команды. Клиент привлёк финансирование на $500K.",
    tags: ["Питч-дек", "IT", "Инвестиции", "Финмодель"],
  },
  {
    title: "Бизнес-план ресторана",
    category: "Бизнес-план",
    image: "/restaurant-website-design.png",
    description:
      "Полный бизнес-план для открытия ресторана: концепция, анализ конкурентов, финансовые прогнозы на 3 года, план маркетинга. Использован для получения кредита в банке.",
    tags: ["Бизнес-план", "HoReCa", "Банк", "Финансы"],
  },
  {
    title: "Корпоративная презентация",
    category: "Корпоративная презентация",
    image: "/professional-corporate-website.png",
    description:
      "Презентация компании для выхода на новые рынки. Включает историю бренда, портфолио проектов, кейсы и коммерческое предложение. 45 слайдов в фирменном стиле.",
    tags: ["Корпоратив", "Брендинг", "B2B", "Продажи"],
  },
  {
    title: "Маркетинг-кит для агентства",
    category: "Маркетинговые материалы",
    image: "/modern-ecommerce-website.png",
    description:
      "Полный комплект маркетинговых материалов: презентация услуг, коммерческое предложение, кейс-стади и one-pager. Повысил конверсию на переговорах на 35%.",
    tags: ["Маркетинг-кит", "Агентство", "КП", "Кейсы"],
  },
]

export function PortfolioSection() {
  return (
    <section id="portfolio" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">Примеры наших работ</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Посмотрите, какие проекты мы уже реализовали — от стартап-питчей до корпоративных презентаций и бизнес-планов для банков.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card
              key={index}
              className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300"
            >
              <div className="relative overflow-hidden aspect-video">
                <img
                  src={project.image || "/placeholder.svg"}
                  alt={project.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Заказать похожий <Icon name="ArrowRight" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-sm text-primary font-semibold mb-2">{project.category}</p>
                <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
