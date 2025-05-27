const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
require('dotenv').config();

// HTML 模板函數（將模板分離到函數中）
const templates = {
    // 首頁模板
    home: () => `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureApp - 企業級登入系統</title>
    <style>
        /* 你的改進版 CSS 在這裡 */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 20px;
        }
        
        .hero {
            text-align: center;
            max-width: 900px;
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            padding: 60px 40px;
            border-radius: 24px;
            backdrop-filter: blur(20px);
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            margin-bottom: 1.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            font-size: 1.4rem;
            margin-bottom: 2.5rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .status {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 25px;
            border-radius: 16px;
            margin: 40px 0;
            backdrop-filter: blur(10px);
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 50px 0;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.08);
            padding: 30px 25px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            transition: all 0.4s ease;
            backdrop-filter: blur(10px);
        }
        
        .feature:hover {
            transform: translateY(-8px);
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .feature h3 {
            font-size: 1.3rem;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .feature p {
            opacity: 0.85;
            line-height: 1.5;
        }
        
        .btn {
            display: inline-block;
            padding: 20px 40px;
            margin: 15px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            background: white;
        }
        
        .demo-accounts {
            background: rgba(0, 0, 0, 0.15);
            padding: 30px;
            border-radius: 20px;
            margin-top: 40px;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .demo-accounts h3 {
            text-align: center;
            margin-bottom: 25px;
            font-size: 1.3rem;
        }
        
        .account {
            background: rgba(255, 255, 255, 0.08);
            padding: 20px;
            margin: 15px 0;
            border-radius: 12px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.95rem;
            line-height: 1.6;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        
        .account:hover {
            background: rgba(255, 255, 255, 0.12);
        }
        
        .account strong {
            display: block;
            margin-bottom: 8px;
            color: #60a5fa;
        }
        
        @media (max-width: 768px) {
            .hero { padding: 40px 20px; }
            .features { grid-template-columns: 1fr; gap: 20px; }
            .btn { padding: 18px 35px; margin: 10px 5px; }
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>🔐 SecureApp</h1>
        <p class="subtitle">企業級安全認證系統</p>
        
        <div class="status">
            <strong>✅ 系統運行正常</strong><br>
            <small>Node.js ${process.version} | JWT 認證 | Azure 就緒</small>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🛡️</div>
                <h3>安全認證</h3>
                <p>JWT Token + bcrypt 加密保護</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🗄️</div>
                <h3>資料庫整合</h3>
                <p>Azure SQL Database 雲端支援</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🚀</div>
                <h3>雲端部署</h3>
                <p>Azure App Service 自動化部署</p>
            </div>
        </div>
        
        <div>
            <a href="/login" class="btn">🚪 系統登入</a>
            <a href="/register" class="btn" style="background: rgba(255, 255, 255, 0.1); color: white;">👤 註冊帳號</a>
        </div>
        
        <div class="demo-accounts">
            <h3>🧪 測試帳號</h3>
            <div class="account">
                <strong>管理員帳戶</strong>
                用戶名: admin<br>
                密碼: SecureAdmin2024!
            </div>
            <div class="account">
                <strong>演示帳戶</strong>
                用戶名: demo<br>
                密碼: Demo123!
            </div>
        </div>
    </div>
</body>
</html>`,

    // 登入頁面模板
    login: () => `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登入 - SecureApp</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            background: linear-gradient(135deg, #667eea, #764ba2);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .login-container {
            background: rgba(255, 255, 255, 0.95);
            padding: 50px;
            border-radius: 24px;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
            font-size: 3rem;
        }
        
        h2 {
            text-align: center;
            color: #333;
            margin-bottom: 40px;
            font-size: 2rem;
            font-weight: 700;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 600;
            font-size: 0.95rem;
        }
        
        input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e1e5e9;
            border-radius: 16px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: #fafbfc;
            box-sizing: border-box;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            transform: translateY(-1px);
        }
        
        .btn {
            width: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 18px;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .message {
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
        }
        
        .success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #34d399;
        }
        
        .error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #f87171;
        }
        
        .info {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #60a5fa;
        }
        
        .back-link {
            text-align: center;
            margin-top: 25px;
        }
        
        .back-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .back-link a:hover {
            color: #5a67d8;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 15px;
        }
        
        .spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .login-container {
                padding: 30px 20px;
                margin: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">🔐</div>
        <h2>系統登入</h2>
        <div id="message"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">用戶名或 Email</label>
                <input type="text" id="username" placeholder="請輸入用戶名或 Email" required>
            </div>
            
            <div class="form-group">
                <label for="password">密碼</label>
                <input type="password" id="password" placeholder="請輸入密碼" required>
            </div>
            
            <button type="submit" class="btn" id="loginBtn">登入</button>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>正在驗證中...</p>
            </div>
        </form>
        
        <div class="back-link">
            <a href="/">← 返回首頁</a>
        </div>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');
            
            if (!username || !password) {
                messageDiv.innerHTML = '<div class="message error">❌ 請填寫所有欄位</div>';
                return;
            }
            
            // 顯示載入狀態
            loginBtn.disabled = true;
            loginBtn.textContent = '登入中...';
            loading.style.display = 'block';
            messageDiv.innerHTML = '';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    messageDiv.innerHTML = '<div class="message success">✅ ' + result.message + '</div>';
                    
                    // 儲存 token
                    localStorage.setItem('authToken', result.token);
                    
                    // 跳轉到控制台
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                } else {
                    messageDiv.innerHTML = '<div class="message error">❌ ' + result.message + '</div>';
                }
            } catch (error) {
                console.error('登入錯誤:', error);
                messageDiv.innerHTML = '<div class="message error">❌ 連接失敗，請檢查網路連接</div>';
            } finally {
                // 恢復按鈕狀態
                loginBtn.disabled = false;
                loginBtn.textContent = '登入';
                loading.style.display = 'none';
            }
        });
        
        // 檢查是否已登入
        window.addEventListener('load', function() {
            const token = localStorage.getItem('authToken');
            if (token) {
                document.getElementById('message').innerHTML = 
                    '<div class="message info">💡 您似乎已經登入，<a href="/dashboard">點此進入控制台</a></div>';
            }
        });
    </script>
</body>
</html>`,

    // 控制台模板
    dashboard: () => `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>控制台 - SecureApp</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            background: linear-gradient(135deg, #667eea, #764ba2);
            min-height: 100vh;
            padding: 20px;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        h1 {
            color: #333;
            font-size: 2.5rem;
            font-weight: 800;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(255, 107, 107, 0.4);
        }
        
        .welcome {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
            color: #065f46;
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 30px;
            border-left: 6px solid #10b981;
        }
        
        .welcome h2 {
            margin-bottom: 10px;
            font-size: 1.8rem;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            border: 1px solid #f1f5f9;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
        
        .stat-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 800;
            color: #333;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🎛️ 用戶控制台</h1>
            <button onclick="logout()" class="btn-danger">🚪 登出</button>
        </div>
        
        <div class="welcome">
            <h2>歡迎進入 SecureApp！🎉</h2>
            <p>您已成功登入系統。這裡是用戶控制台，所有功能都已就緒。</p>
            <p><small>系統採用企業級安全架構，整合 Azure SQL Database 和完整的用戶管理功能。</small></p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-number">2</div>
                <div class="stat-label">註冊用戶</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔐</div>
                <div class="stat-number">100%</div>
                <div class="stat-label">安全性評分</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-number">24/7</div>
                <div class="stat-label">系統運行時間</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌟</div>
                <div class="stat-number">Enterprise</div>
                <div class="stat-label">版本等級</div>
            </div>
        </div>
    </div>
    
    <script>
        // 檢查登入狀態
        window.addEventListener('load', function() {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('請先登入！');
                window.location.href = '/login';
            }
        });
        
        function logout() {
            if (confirm('確定要登出嗎？')) {
                localStorage.removeItem('authToken');
                alert('已成功登出！');
                window.location.href = '/';
            }
        }
    </script>
</body>
</html>`
};

// 資料庫配置
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// 其餘的伺服器邏輯保持不變...
// （包括 userQueries、認證邏輯等）

// 主伺服器
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 安全標頭
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'");
    
    // CORS 設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // 路由處理 - 使用模板函數
        if (pathname === '/' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(templates.home());
        }
        else if (pathname === '/login' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(templates.login());
        }
        else if (pathname === '/dashboard' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(templates.dashboard());
        }
        // API 路由保持不變...
        else {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                success: false,
                message: '找不到請求的資源'
            }));
        }
        
    } catch (error) {
        console.error('伺服器錯誤:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: false,
            message: '伺服器內部錯誤'
        }));
    }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🎉 SecureApp 改進版啟動成功！');
    console.log(`📍 http://localhost:${PORT}`);
});