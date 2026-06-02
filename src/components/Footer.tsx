export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ProSlide Premium</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              2026 ProSlide Premium. Все права защищены.<br />Проекты и презентации любой сложности.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Навигация</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  О нас
                </a>
              </li>
              <li>
                <a href="#services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Услуги
                </a>
              </li>
              <li>
                <a href="#portfolio" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Портфолио
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Контакты
                </a>
              </li>
              <li>
                <a href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Техподдержка
                </a>
              </li>
            </ul>
          </div>


        </div>
      </div>
    </footer>
  )
}