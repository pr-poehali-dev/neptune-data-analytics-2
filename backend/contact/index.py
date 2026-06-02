import json
import os
import psycopg2


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


def handler(event: dict, context) -> dict:
    """Приём заявок с контактной формы сайта"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    name = (body.get('name') or '').strip()
    email = (body.get('email') or '').strip()
    phone = (body.get('phone') or '').strip()
    message = (body.get('message') or '').strip()

    if not name or not email:
        return {'statusCode': 400, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Укажите имя и email'}, ensure_ascii=False)}

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO contact_requests (name, email, phone, message) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, email, phone or None, message or None)
        )
        req_id = cur.fetchone()[0]
        conn.commit()
        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'success': True, 'id': req_id})}
    finally:
        conn.close()
