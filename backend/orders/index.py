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
SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p12224128_neptune_data_analyti')


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_user_by_session(conn, session_id: str):
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.email, u.name, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
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


def check_promo(cur, code: str):
    """Проверить промокод. Вернуть (discount_percent, promo_id) или (None, None)."""
    cur.execute(
        f"""SELECT id, discount_percent FROM {SCHEMA}.promo_codes
            WHERE code = %s AND is_active = TRUE
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR used_count < max_uses)""",
        (code.upper(),)
    )
    row = cur.fetchone()
    if row:
        return row[1], row[0]
    return None, None


def handler(event: dict, context) -> dict:
    """Управление заказами: создание, просмотр, смена статуса, загрузка файла, проверка промокода."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = get_db()

    qs = event.get('queryStringParameters') or {}
    if isinstance(qs, str):
        import urllib.parse
        qs = dict(urllib.parse.parse_qsl(qs))

    # GET ?action=stats — публичный счётчик
    if event.get('httpMethod') == 'GET' and qs.get('action') == 'stats':
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE status IN ('new', 'in_progress', 'review')")
        in_progress = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE status = 'done'")
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
            cur.execute(f"SELECT o.id, o.title, o.description, o.status, o.file_url, o.created_at, o.updated_at, u.name, u.email, o.promo_code, o.discount_percent FROM {SCHEMA}.orders o JOIN {SCHEMA}.users u ON u.id = o.user_id ORDER BY o.created_at DESC")
        else:
            cur.execute(f"SELECT o.id, o.title, o.description, o.status, o.file_url, o.created_at, o.updated_at, u.name, u.email, o.promo_code, o.discount_percent FROM {SCHEMA}.orders o JOIN {SCHEMA}.users u ON u.id = o.user_id WHERE o.user_id = %s ORDER BY o.created_at DESC", (user['id'],))
        rows = cur.fetchall()
        orders = [{'id': r[0], 'title': r[1], 'description': r[2], 'status': r[3], 'file_url': r[4], 'created_at': str(r[5]), 'updated_at': str(r[6]), 'client_name': r[7], 'client_email': r[8], 'promo_code': r[9], 'discount_percent': r[10] or 0} for r in rows]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(orders, ensure_ascii=False)}

    # POST check_promo — проверить промокод
    if method == 'POST' and action == 'check_promo':
        code = body.get('code', '').strip()
        if not code:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Введите промокод'}, ensure_ascii=False)}
        discount, _ = check_promo(cur, code)
        if discount is None:
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Промокод не найден или недействителен'}, ensure_ascii=False)}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'discount_percent': discount})}

    # POST create — создать заказ
    if method == 'POST' and action == 'create':
        title = body.get('title', '').strip()
        description = body.get('description', '').strip()
        promo_code = body.get('promo_code', '').strip().upper() or None
        if not title:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите название заказа'}, ensure_ascii=False)}

        discount_percent = 0
        if promo_code:
            discount, promo_id = check_promo(cur, promo_code)
            if discount is None:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Промокод недействителен'}, ensure_ascii=False)}
            discount_percent = discount
            cur.execute(f"UPDATE {SCHEMA}.promo_codes SET used_count = used_count + 1 WHERE id = %s", (promo_id,))

        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (user_id, title, description, promo_code, discount_percent) VALUES (%s, %s, %s, %s, %s) RETURNING id, title, description, status, created_at, promo_code, discount_percent",
            (user['id'], title, description, promo_code, discount_percent)
        )
        row = cur.fetchone()
        conn.commit()
        order = {'id': row[0], 'title': row[1], 'description': row[2], 'status': row[3], 'created_at': str(row[4]), 'promo_code': row[5], 'discount_percent': row[6] or 0}
        try:
            promo_info = f" (промокод {promo_code}, скидка {discount_percent}%)" if promo_code else ""
            html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#FF0035">📦 Новый заказ #{order['id']}</h2>
              <p><b>Клиент:</b> {user['name']} ({user['email']})</p>
              <p><b>Название:</b> {title}{promo_info}</p>
              <p style="margin-top:24px"><a href="{SITE_URL}/admin" style="background:#FF0035;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Открыть в админке</a></p>
            </div>"""
            send_email(ADMIN_EMAIL, f"Новый заказ #{order['id']}: {title}", html)
        except Exception:
            pass
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(order, ensure_ascii=False)}

    # POST promo_create — создать промокод (только admin)
    if method == 'POST' and action == 'promo_create':
        if user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        code = body.get('code', '').strip().upper()
        discount_percent = int(body.get('discount_percent', 0))
        max_uses = body.get('max_uses') or None
        expires_at = body.get('expires_at') or None
        if not code or not discount_percent:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите код и процент скидки'}, ensure_ascii=False)}
        cur.execute(
            f"INSERT INTO {SCHEMA}.promo_codes (code, discount_percent, max_uses, expires_at) VALUES (%s, %s, %s, %s) RETURNING id, code, discount_percent, max_uses, used_count, is_active, expires_at, created_at",
            (code, discount_percent, max_uses, expires_at)
        )
        row = cur.fetchone()
        conn.commit()
        promo = {'id': row[0], 'code': row[1], 'discount_percent': row[2], 'max_uses': row[3], 'used_count': row[4], 'is_active': row[5], 'expires_at': str(row[6]) if row[6] else None, 'created_at': str(row[7])}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(promo, ensure_ascii=False)}

    # GET ?action=promos — список промокодов (только admin)
    if method == 'GET' and qs.get('action') == 'promos':
        if user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        cur.execute(f"SELECT id, code, discount_percent, max_uses, used_count, is_active, expires_at, created_at FROM {SCHEMA}.promo_codes ORDER BY created_at DESC")
        rows = cur.fetchall()
        promos = [{'id': r[0], 'code': r[1], 'discount_percent': r[2], 'max_uses': r[3], 'used_count': r[4], 'is_active': r[5], 'expires_at': str(r[6]) if r[6] else None, 'created_at': str(r[7])} for r in rows]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'promos': promos}, ensure_ascii=False)}

    # PUT promo_toggle — вкл/выкл промокод (только admin)
    if method == 'PUT' and action == 'promo_toggle':
        if user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        promo_id = body.get('id')
        is_active = body.get('is_active')
        cur.execute(f"UPDATE {SCHEMA}.promo_codes SET is_active = %s WHERE id = %s", (is_active, promo_id))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    # PUT status — сменить статус (админ и support)
    if method == 'PUT' and action == 'status':
        if user['role'] not in ('admin', 'support'):
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}
        order_id = body.get('id')
        status = body.get('status', '')
        allowed = ['new', 'in_progress', 'review', 'done']
        if status not in allowed:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Недопустимый статус'}, ensure_ascii=False)}
        cur.execute(f"SELECT o.title, u.name, u.email FROM {SCHEMA}.orders o JOIN {SCHEMA}.users u ON u.id = o.user_id WHERE o.id = %s", (order_id,))
        order_row = cur.fetchone()
        cur.execute(f"UPDATE {SCHEMA}.orders SET status = %s, updated_at = NOW() WHERE id = %s", (status, order_id))
        conn.commit()
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
        cur.execute(f"UPDATE {SCHEMA}.orders SET file_url = %s, updated_at = NOW() WHERE id = %s", (file_url, order_id))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
