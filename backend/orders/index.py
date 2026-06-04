import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2

SMTP_HOST = 'smtp.yandex.ru'
SMTP_PORT = 465
SMTP_USER = 'egorkrivolap@yandex.ru'
ADMIN_EMAIL = 'egorkrivolap@yandex.ru'
SITE_URL = 'https://proeksty.poehali.app'
STATUS_LABELS = {'new': 'Новый', 'in_progress': 'В работе', 'review': 'На проверке', 'done': 'Готово'}


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_user_by_session(conn, session_id: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    if row:
        return {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
    return None


def get_session_id(event):
    return event.get('headers', {}).get('x-session-id', '') or ''


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


def handler(event: dict, context) -> dict:
    """Управление заказами: создание, просмотр, смена статуса, загрузка файла."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = get_db()

    # GET ?action=stats — публичный счётчик заказов (без авторизации)
    qs = event.get('queryStringParameters') or {}
    if isinstance(qs, str):
        import urllib.parse
        qs = dict(urllib.parse.parse_qsl(qs))
    if event.get('httpMethod') == 'GET' and qs.get('action') == 'stats':
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM orders WHERE status IN ('new', 'in_progress', 'review')")
        in_progress = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM orders WHERE status = 'done'")
        done = cur.fetchone()[0]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'in_progress': in_progress, 'done': done})}

    session_id = get_session_id(event)
    if not session_id:
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'}, ensure_ascii=False)}

    user = get_user_by_session(conn, session_id)
    if not user:
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'}, ensure_ascii=False)}

    method = event.get('httpMethod')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    cur = conn.cursor()

    # GET — список заказов
    if method == 'GET':
        if user['role'] in ('admin', 'support'):
            cur.execute("SELECT o.id, o.title, o.description, o.status, o.file_url, o.created_at, o.updated_at, u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC")
        else:
            cur.execute("SELECT o.id, o.title, o.description, o.status, o.file_url, o.created_at, o.updated_at, u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = %s ORDER BY o.created_at DESC", (user['id'],))
        rows = cur.fetchall()
        orders = [{'id': r[0], 'title': r[1], 'description': r[2], 'status': r[3], 'file_url': r[4], 'created_at': str(r[5]), 'updated_at': str(r[6]), 'client_name': r[7], 'client_email': r[8]} for r in rows]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(orders, ensure_ascii=False)}

    # POST create — создать заказ
    if method == 'POST' and action == 'create':
        title = body.get('title', '').strip()
        description = body.get('description', '').strip()
        if not title:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите название заказа'}, ensure_ascii=False)}
        cur.execute("INSERT INTO orders (user_id, title, description) VALUES (%s, %s, %s) RETURNING id, title, description, status, created_at", (user['id'], title, description))
        row = cur.fetchone()
        conn.commit()
        order = {'id': row[0], 'title': row[1], 'description': row[2], 'status': row[3], 'created_at': str(row[4])}
        # Уведомление админу о новом заказе
        try:
            html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#FF0035">📦 Новый заказ #{order['id']}</h2>
              <p><b>Клиент:</b> {user['name']} ({user['email']})</p>
              <p><b>Название:</b> {title}</p>
              <p style="margin-top:24px"><a href="{SITE_URL}/admin" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Открыть в админке</a></p>
            </div>"""
            send_email(ADMIN_EMAIL, f"Новый заказ #{order['id']}: {title}", html)
        except Exception:
            pass
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(order, ensure_ascii=False)}

    # PUT status — сменить статус (админ и support)
    if method == 'PUT' and action == 'status':
        if user['role'] not in ('admin', 'support'):
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        order_id = body.get('id')
        status = body.get('status', '')
        allowed = ['new', 'in_progress', 'review', 'done']
        if status not in allowed:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Недопустимый статус'}, ensure_ascii=False)}
        # Получаем данные заказа для уведомления
        cur.execute("SELECT o.title, u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = %s", (order_id,))
        order_row = cur.fetchone()
        cur.execute("UPDATE orders SET status = %s, updated_at = NOW() WHERE id = %s", (status, order_id))
        conn.commit()
        # Уведомление клиенту о смене статуса
        if order_row:
            try:
                label = STATUS_LABELS.get(status, status)
                html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <h2 style="color:#FF0035">🔄 Статус заказа обновлён</h2>
                  <p>Здравствуйте, <b>{order_row[1]}</b>!</p>
                  <p>Статус вашего заказа <b>«{order_row[0]}»</b> изменён на: <b>{label}</b></p>
                  <p style="margin-top:24px"><a href="{SITE_URL}/dashboard" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Открыть личный кабинет</a></p>
                </div>"""
                send_email(order_row[2], f"Заказ #{order_id}: статус изменён на «{label}»", html)
            except Exception:
                pass
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    # PUT file — загрузить файл (админ и support)
    if method == 'PUT' and action == 'file':
        if user['role'] not in ('admin', 'support'):
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        order_id = body.get('id')
        file_url = body.get('file_url', '').strip()
        if not file_url:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите ссылку на файл'}, ensure_ascii=False)}
        cur.execute("UPDATE orders SET file_url = %s, updated_at = NOW() WHERE id = %s", (file_url, order_id))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
