import os
import asyncio
import base64
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from telethon import TelegramClient

app = Flask(__name__)
CORS(app)

API_ID = int(os.getenv('API_ID', '0'))
API_HASH = os.getenv('API_HASH', '')
PHONE = os.getenv('PHONE', '')
TARGET_CHAT = os.getenv('TARGET_CHAT', 'me')  # e.g. me, @your_bot_username, -100xxxxxxxxxx
SEARCH_TAG = os.getenv('SEARCH_TAG', '#ucloud')

if not API_ID or not API_HASH or not PHONE:
    print('Warning: API_ID/API_HASH/PHONE is not fully configured.')

client = TelegramClient('session', API_ID, API_HASH)


def run_async(coro):
    """Run async coroutines from sync Flask handlers."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def ensure_client_started():
    await client.start(phone=PHONE)


@app.route('/', methods=['GET'])
def home():
    return jsonify(
        {
            'status': 'active',
            'message': 'Telegram Backend is running',
            'endpoints': ['/upload', '/files', '/download/<message_id>'],
            'target_chat': TARGET_CHAT,
            'search_tag': SEARCH_TAG,
        }
    )


@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        data = request.json or {}
        filename = data.get('filename')
        filesize = data.get('size')
        file_data = data.get('data')

        if not filename or not file_data:
            return jsonify({'success': False, 'error': 'filename and data are required'}), 400

        file_bytes = base64.b64decode(file_data)
        temp_path = os.path.join(tempfile.gettempdir(), filename)

        with open(temp_path, 'wb') as f:
            f.write(file_bytes)

        async def upload():
            await ensure_client_started()
            searchable_name = (filename or '').replace(' ', '_')
            caption = (
                f"📁 {filename}\n"
                f"📦 {format_size(filesize or len(file_bytes))}\n"
                f"{SEARCH_TAG} #{searchable_name}"
            )
            message = await client.send_file(
                TARGET_CHAT,
                temp_path,
                caption=caption,
            )
            return {'message_id': message.id}

        result = run_async(upload())
        return jsonify({'success': True, **result})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/files', methods=['GET'])
def list_files():
    try:
        async def get_files():
            await ensure_client_started()
            files_list = []
            async for message in client.iter_messages(TARGET_CHAT, limit=50):
                if message.file:
                    files_list.append(
                        {
                            'id': message.id,
                            'name': message.file.name or 'unknown',
                            'size': message.file.size,
                            'size_formatted': format_size(message.file.size),
                            'date': str(message.date),
                            'mime_type': message.file.mime_type,
                            'download_ref': f"/download/{message.id}",
                        }
                    )
            return files_list

        files = run_async(get_files())
        return jsonify({'success': True, 'files': files})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download/<int:message_id>', methods=['GET'])
def download_file(message_id):
    try:
        async def download():
            await ensure_client_started()
            message = await client.get_messages(TARGET_CHAT, ids=message_id)
            if not message or not message.file:
                return None

            path = await message.download_media(file=tempfile.gettempdir())
            with open(path, 'rb') as f:
                raw_data = f.read()
            os.remove(path)

            return {
                'filename': message.file.name or f'{message_id}',
                'data': base64.b64encode(raw_data).decode(),
            }

        result = run_async(download())

        if result:
            return jsonify({'success': True, **result})
        return jsonify({'success': False, 'error': 'File not found'}), 404

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def format_size(size):
    if size is None:
        return '0.00 B'
    size = float(size)
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
