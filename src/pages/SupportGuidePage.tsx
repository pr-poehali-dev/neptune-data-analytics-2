import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/icon'

const ISSUES = [
  {
    category: 'Авторизация',
    icon: 'LogIn',
    color: 'text-blue-500',
    items: [
      {
        title: 'Не могу войти — «Неверный email или пароль»',
        description: 'Пользователь вводит неправильные данные или путает регистр email.',
        solution: 'Попросите проверить email на опечатки. Если пароль забыт — создайте новый аккаунт или попросите администратора сбросить пароль вручную.',
        tag: 'Частая',
      },
      {
        title: 'Сессия истекла — выбрасывает из кабинета',
        description: 'Сессия хранится в браузере и имеет срок жизни. После истечения пользователь автоматически выходит.',
        solution: 'Попросите пользователя выйти и войти заново. Это штатное поведение системы.',
        tag: 'Частая',
      },
      {
        title: 'После регистрации ничего не происходит',
        description: 'Форма требует имя, email и пароль не короче 6 символов. При неполных данных сервер вернёт ошибку.',
        solution: 'Убедитесь, что все поля заполнены, email корректный, пароль не менее 6 символов. Ошибка отображается под кнопкой.',
        tag: 'Редкая',
      },
      {
        title: 'Email уже зарегистрирован',
        description: 'Пользователь пытается создать второй аккаунт с тем же email.',
        solution: 'Предложите войти в существующий аккаунт через форму входа.',
        tag: 'Редкая',
      },
    ],
  },
  {
    category: 'Личный кабинет и заказы',
    icon: 'ShoppingBag',
    color: 'text-violet-500',
    items: [
      {
        title: 'Не вижу свои заказы',
        description: 'Заказы привязаны к аккаунту. Если пользователь зашёл с другого браузера или устройства без авторизации — заказы не отображаются.',
        solution: 'Попросите войти в тот же аккаунт, под которым создавались заказы.',
        tag: 'Частая',
      },
      {
        title: 'Кнопка «Создать заказ» не работает',
        description: 'Поле «Название заказа» обязательно. Без него форма не отправляется.',
        solution: 'Убедитесь, что пользователь заполнил название. Поле описания — необязательное.',
        tag: 'Частая',
      },
      {
        title: 'Заказ завис в статусе «Новый»',
        description: 'Статус меняется вручную сотрудником. Автоматической смены нет.',
        solution: 'Смените статус заказа на «В работе» во вкладке Заказы панели поддержки.',
        tag: 'Рабочий процесс',
      },
      {
        title: 'Клиент не видит готовый файл',
        description: 'Ссылка на файл прикрепляется вручную. Если поле пустое — клиент ничего не видит.',
        solution: 'Вставьте ссылку на готовый файл в карточке заказа (вкладка Заказы) и смените статус на «Готово».',
        tag: 'Рабочий процесс',
      },
      {
        title: 'Клиент не может удалить заказ',
        description: 'Функция удаления заказов не предусмотрена — намеренно, для сохранения истории.',
        solution: 'Объясните клиенту, что история заказов не удаляется. При необходимости смените статус на «Готово».',
        tag: 'Ограничение',
      },
    ],
  },
  {
    category: 'Чат по заказу',
    icon: 'MessageCircle',
    color: 'text-green-500',
    items: [
      {
        title: 'Сообщение не отправляется',
        description: 'Пустое сообщение или только пробелы не отправляются.',
        solution: 'Убедитесь, что пользователь ввёл текст. Поле нельзя отправить пустым.',
        tag: 'Редкая',
      },
      {
        title: 'Клиент не видит ответ в чате',
        description: 'Чат обновляется только при открытии заказа — автоматического уведомления нет.',
        solution: 'Попросите клиента обновить страницу или переоткрыть заказ. Уведомления по email не отправляются.',
        tag: 'Частая',
      },
    ],
  },
  {
    category: 'Обращения в поддержку',
    icon: 'Headphones',
    color: 'text-orange-500',
    items: [
      {
        title: 'Не могу найти своё обращение',
        description: 'Обращение создаётся без авторизации — только по email и имени. Поиска нет.',
        solution: 'Попросите назвать номер обращения (показывается после отправки формы) или email. Найдите по ним в списке.',
        tag: 'Частая',
      },
      {
        title: 'Клиент не получает ответ',
        description: 'Ответы хранятся только на сайте. Email-уведомлений нет.',
        solution: 'Объясните, что ответ появляется на странице /support при вводе номера обращения. Дайте клиенту номер.',
        tag: 'Частая',
      },
      {
        title: 'Одинаковые обращения от одного клиента',
        description: 'Клиент не знает, что обращение уже создано, и создаёт повторные.',
        solution: 'Закройте дубли вручную (статус «Закрыт»), оставьте одно актуальное. Напишите клиенту номер рабочего обращения.',
        tag: 'Редкая',
      },
      {
        title: 'Обращение зависло в статусе «Открыт»',
        description: 'Статус меняется вручную. После ответа система меняет на «Отвечен» автоматически.',
        solution: 'Если ответ дан — смените статус на «Отвечен» или «Закрыт» вручную через выпадающий список.',
        tag: 'Рабочий процесс',
      },
    ],
  },
  {
    category: 'Роли и доступ',
    icon: 'Shield',
    color: 'text-red-500',
    items: [
      {
        title: 'Клиент попал на страницу поддержки или админки',
        description: 'Прямой переход по URL — система перенаправит на /dashboard.',
        solution: 'Это нормальное поведение. Клиент без нужной роли автоматически редиректится.',
        tag: 'Редкая',
      },
      {
        title: 'Нужно повысить права пользователя',
        description: 'Только администратор может менять роли через вкладку Пользователи в админ-панели.',
        solution: 'Обратитесь к администратору. Роли: client (клиент), support (поддержка), admin (администратор).',
        tag: 'Ограничение',
      },
      {
        title: 'Сотрудник поддержки не видит нужный раздел',
        description: 'Роль support открывает доступ к /support-panel (обращения + заказы). Аналитика и управление пользователями — только для admin.',
        solution: 'Проверьте роль пользователя. Если нужен расширенный доступ — попросите администратора назначить роль admin.',
        tag: 'Ограничение',
      },
    ],
  },
]

const TAG_STYLE: Record<string, string> = {
  'Частая': 'bg-red-100 text-red-700',
  'Редкая': 'bg-gray-100 text-gray-600',
  'Рабочий процесс': 'bg-blue-100 text-blue-700',
  'Ограничение': 'bg-yellow-100 text-yellow-700',
}

export default function SupportGuidePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user && user.role !== 'support' && user.role !== 'admin') navigate('/dashboard')
  }, [user, loading, navigate])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/"><Logo /></a>
            <Badge variant="secondary" className="text-xs">Поддержка</Badge>
          </div>
          <Link to="/support-panel">
            <Button variant="outline" size="sm" className="gap-2">
              <Icon name="ArrowLeft" size={16} />
              Назад в панель
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Icon name="BookOpen" size={14} />
            Памятка для сотрудника поддержки
          </div>
          <h1 className="text-4xl font-bold mb-3">Частые проблемы и решения</h1>
          <p className="text-muted-foreground text-lg">Справочник по всем ситуациям, с которыми обращаются пользователи. Используй как шпаргалку при работе с обращениями.</p>

          <div className="flex gap-4 mt-6 flex-wrap">
            {Object.entries(TAG_STYLE).map(([tag, cls]) => (
              <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {ISSUES.map(section => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-4">
                <Icon name={section.icon} size={20} className={section.color} />
                <h2 className="text-xl font-bold">{section.category}</h2>
              </div>
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <Card key={i} className="transition-all hover:border-primary/50">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-semibold leading-snug">{item.title}</CardTitle>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${TAG_STYLE[item.tag] || 'bg-gray-100 text-gray-600'}`}>{item.tag}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-2">
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <Icon name="Info" size={15} className="shrink-0 mt-0.5" />
                        <p>{item.description}</p>
                      </div>
                      <div className="flex gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <Icon name="CheckCircle" size={15} className="shrink-0 mt-0.5 text-primary" />
                        <p><span className="font-medium text-primary">Решение:</span> {item.solution}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-2xl border bg-muted/40">
          <div className="flex gap-3">
            <Icon name="AlertCircle" size={20} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Не нашёл решение?</p>
              <p className="text-sm text-muted-foreground">Если ситуация нестандартная — передай обращение администратору. Для системных проблем (ошибки сервера, недоступность страниц) обращайся на <a href="https://poehali.dev/help" target="_blank" rel="noreferrer" className="text-primary underline">poehali.dev/help</a>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}