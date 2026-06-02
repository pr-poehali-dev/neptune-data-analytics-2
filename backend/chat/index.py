import json
import os
import psycopg2


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
    cookie_header = event.get('headers', {}).get('x-cookie', '')
    for part in cookie_header.split(';'):
        part = part.strip()
        if part.startswith('session='):
            return part[8:]
    return None


def handler(event: dict, context) -> dict:
    """Чат по заказу: получить сообщения и отправить новое."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Cookie',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = get_db()
    session_id = get_session_id(event)
    if not session_id:
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'}, ensure_ascii=False)}

    user = get_user_by_session(conn, session_id)
    if not user:
        return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'}, ensure_ascii=False)}

    method = event.get('httpMethod')
    body = json.loads(event.get('body') or '{}')
    params = event.get('queryStringParameters') or {}
    cur = conn.cursor()

    order_id = params.get('order_id') or body.get('order_id')
    if not order_id:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите order_id'}, ensure_ascii=False)}

    # Проверяем доступ к заказу
    if user['role'] != 'admin':
        cur.execute("SELECT id FROM orders WHERE id = %s AND user_id = %s", (order_id, user['id']))
        if not cur.fetchone():
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'}, ensure_ascii=False)}

    # GET — получить сообщения
    if method == 'GET':
        cur.execute(
            "SELECT m.id, m.text, m.created_at, u.name, u.role FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.order_id = %s ORDER BY m.created_at ASC",
            (order_id,)
        )
        rows = cur.fetchall()
        msgs = [{'id': r[0], 'text': r[1], 'created_at': str(r[2]), 'sender_name': r[3], 'sender_role': r[4]} for r in rows]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(msgs, ensure_ascii=False)}

    # POST — отправить сообщение
    if method == 'POST':
        text = body.get('text', '').strip()
        if not text:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Сообщение не может быть пустым'}, ensure_ascii=False)}
        cur.execute(
            "INSERT INTO messages (order_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, text, created_at",
            (order_id, user['id'], text)
        )
        row = cur.fetchone()
        conn.commit()
        msg = {'id': row[0], 'text': row[1], 'created_at': str(row[2]), 'sender_name': user['name'], 'sender_role': user['role']}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(msg, ensure_ascii=False)}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}