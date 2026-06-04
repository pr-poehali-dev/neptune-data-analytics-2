import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465
SMTP_USER = 'egorkrivolap@yandex.ru'
ADMIN_EMAIL = 'egorkrivolap@yandex.ru'
SITE_URL = 'https://proeksty.poehali.app'

STATUS_LABELS = {
    'new': 'Новый',
    'in_progress': 'В работе',
    'review': 'На проверке',
    'done': 'Готово',
}


def send_email(to: str, subject: str, html: str):
    password = os.environ.get('SMTP_PASSWORD', '')
    if not password:
        return
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, password)
        server.sendmail(SMTP_USER, to, msg.as_string())


def notify_new_order(order_id, order_title, client_name, client_email):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#FF0035">📦 Новый заказ #{order_id}</h2>
      <p><b>Клиент:</b> {client_name} ({client_email})</p>
      <p><b>Название:</b> {order_title}</p>
      <p style="margin-top:24px">
        <a href="{SITE_URL}/admin" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Открыть в админке
        </a>
      </p>
    </div>"""
    send_email(ADMIN_EMAIL, f'Новый заказ #{order_id}: {order_title}', html)


def notify_order_status(order_id, order_title, client_name, client_email, status):
    label = STATUS_LABELS.get(status, status)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#FF0035">🔄 Статус заказа обновлён</h2>
      <p>Здравствуйте, <b>{client_name}</b>!</p>
      <p>Статус вашего заказа <b>«{order_title}»</b> изменён на: <b>{label}</b></p>
      <p style="margin-top:24px">
        <a href="{SITE_URL}/dashboard" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Открыть личный кабинет
        </a>
      </p>
    </div>"""
    send_email(client_email, f'Заказ #{order_id}: статус изменён на «{label}»', html)


def notify_new_message(order_id, order_title, to_email, to_name, from_name, text):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#FF0035">💬 Новое сообщение по заказу</h2>
      <p>Здравствуйте, <b>{to_name}</b>!</p>
      <p><b>{from_name}</b> написал по заказу <b>«{order_title}»</b>:</p>
      <blockquote style="border-left:3px solid #FF0035;padding:8px 16px;margin:16px 0;color:#555">{text}</blockquote>
      <p style="margin-top:24px">
        <a href="{SITE_URL}/dashboard" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Ответить в кабинете
        </a>
      </p>
    </div>"""
    send_email(to_email, f'Новое сообщение по заказу #{order_id}', html)


def notify_new_ticket(ticket_id, name, email, subject, message):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#FF0035">🎫 Новое обращение в поддержку #{ticket_id}</h2>
      <p><b>От:</b> {name} ({email})</p>
      <p><b>Тема:</b> {subject}</p>
      <blockquote style="border-left:3px solid #FF0035;padding:8px 16px;margin:16px 0;color:#555">{message}</blockquote>
      <p style="margin-top:24px">
        <a href="{SITE_URL}/support-panel" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
          Открыть панель поддержки
        </a>
      </p>
    </div>"""
    send_email(ADMIN_EMAIL, f'Новое обращение #{ticket_id}: {subject}', html)
