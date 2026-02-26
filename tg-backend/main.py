# main.py

import os
import asyncio
import base64
import json
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from telethon import TelegramClient
import tempfile
import time

app = Flask(__name__)
CORS(app)  # Netlify থেকে কল করার জন্য

# টেলিগ্রাম API ক্রেডেনশিয়াল (my.telegram.org থেকে নাও)
API_ID = 12345  # তোমার API ID
API_HASH = 'your_api_hash_here'  # তোমার API Hash
PHONE = '+8801xxxxxxxx'  # তোমার ফোন নম্বর

# টেলিগ্রাম ক্লায়েন্ট
client = TelegramClient('session', API_ID, API_HASH)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'active',
        'message': 'Telegram Backend is running',
        'endpoints': ['/upload', '/files', '/download/<message_id>']
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    """ফাইল আপলোড API"""
    try:
        data = request.json
        filename = data.get('filename')
        filesize = data.get('size')
        file_data = data.get('data')  # base64 encoded data
        
        # base64 ডিকোড
        file_bytes = base64.b64decode(file_data)
        
        # টেম্প ফাইল সেভ
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, filename)
        
        with open(temp_path, 'wb') as f:
            f.write(file_bytes)
        
        # টেলিগ্রামে আপলোড
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def upload():
            await client.start(phone=PHONE)
            
            # Saved Messages এ আপলোড
            message = await client.send_file(
                'me',  # Saved Messages
                temp_path,
                caption=f"📁 {filename}\n📦 {format_size(filesize)}",
                progress_callback=lambda current, total: print(f"Uploaded: {current}/{total}")
            )
            
            # টেম্প ফাইল ডিলিট
            os.remove(temp_path)
            
            # মেসেজ আইডি থেকে লিংক তৈরি
            chat = await client.get_entity('me')
            message_link = f"https://t.me/c/{chat.id}/{message.id}"
            
            return {
                'message_id': message.id,
                'download_url': message_link
            }
        
        result = loop.run_until_complete(upload())
        
        return jsonify({
            'success': True,
            'message_id': result['message_id'],
            'download_url': result['download_url']
        })
        
    except Exception as e:
        print(f"Upload error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/files', methods=['GET'])
def list_files():
    """Saved Messages থেকে ফাইল লিস্ট দেখাও"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def get_files():
            await client.start(phone=PHONE)
            
            files_list = []
            async for message in client.iter_messages('me', limit=50):
                if message.file:
                    files_list.append({
                        'id': message.id,
                        'name': message.file.name or 'unknown',
                        'size': message.file.size,
                        'size_formatted': format_size(message.file.size),
                        'date': str(message.date),
                        'mime_type': message.file.mime_type,
                        'download_url': f"https://t.me/c/{(await client.get_entity('me')).id}/{message.id}"
                    })
            
            return files_list
        
        files = loop.run_until_complete(get_files())
        
        return jsonify({
            'success': True,
            'files': files
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/download/<int:message_id>', methods=['GET'])
def download_file(message_id):
    """ফাইল ডাউনলোড কর"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def download():
            await client.start(phone=PHONE)
            
            message = await client.get_messages('me', ids=message_id)
            if message and message[0].file:
                # টেম্প ফাইলে ডাউনলোড
                temp_dir = tempfile.gettempdir()
                path = await message[0].download_media(file=temp_dir)
                
                # ফাইল পড়ে base64 এ এনকোড
                with open(path, 'rb') as f:
                    data = f.read()
                
                # টেম্প ফাইল ডিলিট
                os.remove(path)
                
                return {
                    'filename': message[0].file.name,
                    'data': base64.b64encode(data).decode()
                }
            
            return None
        
        result = loop.run_until_complete(download())
        
        if result:
            return jsonify({
                'success': True,
                'filename': result['filename'],
                'data': result['data']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'File not found'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

def format_size(size):
    """ফাইল সাইজ ফরম্যাট"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)