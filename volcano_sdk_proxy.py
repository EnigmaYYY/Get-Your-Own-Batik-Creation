from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time
from volcengine import visual
from volcengine.visual.VisualService import VisualService

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# 创建 VisualService 实例
visual_service = VisualService()

# 设置 AK 和 SK，直接使用 text_to_image.py 中的值
visual_service.set_ak('AKLTZWI3ZmEzZTY2MjEwNDI1ZGFmY2E0Y2Y5Yjg5YmRiN2U')
visual_service.set_sk('TnpobFlUUTNabVE1T1dVM05EWmpNRGxoT1dZNVl6Vm1ZekE1WmpSbU5qUQ==')

# 设置 API 信息
action = "CVProcess"
version = "2022-08-31"
visual_service.set_api_info(action, version)

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint to verify the server is running."""
    return jsonify({
        'status': 'ok',
        'message': 'Volcano Engine SDK Proxy Server is running',
        'timestamp': int(time.time())
    })

@app.route('/generate-image', methods=['POST'])
def generate_image():
    try:
        # 获取请求数据
        data = request.json
        
        # 记录请求
        print(f"Received request: {json.dumps(data, indent=2)}")
        
        # 使用 SDK 调用 API
        try:
            print("Calling Volcano Engine API using SDK...")
            resp = visual_service.cv_json_api(action, data)
            print(f"SDK response: {resp}")
            
            # 检查响应是否成功
            if isinstance(resp, dict) and resp.get('code') == 10000:
                return jsonify(resp)
            else:
                error_message = resp.get('message', 'Unknown error') if isinstance(resp, dict) else str(resp)
                print(f"API error: {error_message}")
                return jsonify({
                    'success': False,
                    'error': error_message,
                    'code': resp.get('code', 50000) if isinstance(resp, dict) else 50000,
                    'message': error_message
                }), 500
        except Exception as e:
            print(f"SDK call failed: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'code': 50000,
                'message': "SDK call failed"
            }), 500
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 50000,
            'message': "Internal server error"
        }), 500

if __name__ == '__main__':
    # 从环境变量获取端口或使用默认值
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting SDK proxy server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
