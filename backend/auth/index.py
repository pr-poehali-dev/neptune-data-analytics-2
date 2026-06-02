import json
import os
import hashlib
import secrets
import psycopg2


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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


def handler(event: dict, context) -> dict:
    """Авторизация: регистрация, вход, выход, получение текущего пользователя."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    conn = get_db()

    # GET — получить текущего пользователя по токену
    if method == 'GET':
        session_id = get_session_id(event)
        if not session_id:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        user = get_user_by_session(conn, session_id)
        if not user:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'})}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(user)}

    # Регистрация
    if method == 'POST' and action == 'register':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '').strip()
        name = body.get('name', '').strip()
        if not email or not password or not name:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Заполните все поля'}, ensure_ascii=False)}
        if len(password) < 6:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'}, ensure_ascii=False)}
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email уже зарегистрирован'}, ensure_ascii=False)}
        cur.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id, email, name, role",
            (email, hash_password(password), name)
        )
        row = cur.fetchone()
        user = {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
        session_id = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user['id']))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({**user, 'session_id': session_id})}

    # Вход
    if method == 'POST' and action == 'login':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '').strip()
        cur = conn.cursor()
        cur.execute("SELECT id, email, name, role FROM users WHERE email = %s AND password_hash = %s", (email, hash_password(password)))
        row = cur.fetchone()
        if not row:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'}, ensure_ascii=False)}
        user = {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
        session_id = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user['id']))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({**user, 'session_id': session_id})}

    # Выход
    if method == 'POST' and action == 'logout':
        session_id = get_session_id(event)
        if session_id:
            cur = conn.cursor()
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
