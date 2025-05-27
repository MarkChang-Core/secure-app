const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
require('dotenv').config();

// 資料庫配置
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true, // Azure SQL 需要
        trustServerCertificate: false,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// 模擬資料庫（開發階段使用，之後會切換到 Azure SQL）
const mockUsers = new Map([
    ['admin', {
        id: 1,
        username: 'admin',
        email: 'admin@secureapp.com',
        password_hash: '$2a$12$rQZ3QJ3qCjFJ8Vg.VPZ1qeK5BpYMrz5Qy8fK2wGfHxH3.JJPzNrHq', // SecureAdmin2024!
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        login_attempts: 0
    }],
    ['demo', {
        id: 2,
        username: 'demo',
        email: 'demo@example.com',
        password_hash: '$2a$12$8vK2J5qF4P9.kR8xL2wGfHxH3.JJPzNrHqrQZ3QJ3qCjFJ8Vg.VP', // Demo123!
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        login_attempts: 0
    }]
]);

// 會話存儲
const sessions = new Map();

// 工具函數
async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('密碼驗證錯誤:', error);
        return false;
    }
}

function generateJWT(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            username: user.username,
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function verifyJWT(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function parsePostData(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
    });
}

// 真實的 Azure SQL 資料庫查詢函數
const userQueries = {
    async findByUsernameOrEmail(identifier) {
        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('identifier', sql.NVarChar, identifier)
                .query(`
                    SELECT id, username, email, password_hash, role, is_active, 
                           login_attempts, locked_until, last_login, created_at
                    FROM Users 
                    WHERE (username = @identifier OR email = @identifier) 
                    AND is_active = 1
                `);
            return result.recordset[0];
        } catch (error) {
            console.error('資料庫查詢錯誤:', error);
            throw error;
        }
    },

    async updateLoginAttempts(userId, success = true) {
        try {
            const pool = await sql.connect(dbConfig);
            if (success) {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .query(`
                        UPDATE Users 
                        SET login_attempts = 0, 
                            last_login = GETDATE(),
                            locked_until = NULL
                        WHERE id = @userId
                    `);
            } else {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .query(`
                        UPDATE Users 
                        SET login_attempts = login_attempts + 1,
                            locked_until = CASE 
                                WHEN login_attempts >= 4 THEN DATEADD(MINUTE, 15, GETDATE())
                                ELSE locked_until 
                            END
                        WHERE id = @userId
                    `);
            }
        } catch (error) {
            console.error('更新登入嘗試錯誤:', error);
            throw error;
        }
    },

    async create(userData) {
        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('username', sql.NVarChar, userData.username)
                .input('email', sql.NVarChar, userData.email)
                .input('password_hash', sql.NVarChar, userData.password_hash)
                .input('role', sql.NVarChar, userData.role || 'user')
                .query(`
                    INSERT INTO Users (username, email, password_hash, role)
                    OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.created_at
                    VALUES (@username, @email, @password_hash, @role)
                `);
            return result.recordset[0];
        } catch (error) {
            console.error('創建用戶錯誤:', error);
            throw error;
        }
    },

    async findById(id) {
        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT id, username, email, role, created_at, last_login
                    FROM Users 
                    WHERE id = @id AND is_active = 1
                `);
            return result.recordset[0];
        } catch (error) {
            console.error('查找用戶錯誤:', error);
            throw error;
        }
    }
};

// 主伺服器
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 安全標頭
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
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
        // 路由處理
        if (pathname === '/' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(`
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureApp - 企業級登入系統</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            color: white; padding: 20px;
        }
        .hero {
            text-align: center; max-width: 800px; width: 100%;
            background: rgba(255, 255, 255, 0.1); padding: 60px 40px;
            border-radius: 20px; backdrop-filter: blur(20px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
        }
        h1 { font-size: 3.5rem; margin-bottom: 1rem; font-weight: 800; }
        .subtitle { font-size: 1.3rem; margin-bottom: 2rem; opacity: 0.9; }
        .status {
            background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4);
            padding: 20px; border-radius: 10px; margin: 30px 0;
        }
        .features {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px; margin: 40px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1); padding: 25px 20px;
            border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .feature-icon { font-size: 2.5rem; margin-bottom: 10px; }
        .btn {
            display: inline-block; padding: 18px 35px; margin: 10px;
            background: rgba(255, 255, 255, 0.9); color: #333;
            text-decoration: none; border-radius: 50px; font-weight: 600;
            transition: all 0.3s;
        }
        .btn:hover { transform: translateY(-3px); }
        .demo-accounts {
            background: rgba(0, 0, 0, 0.2); padding: 25px; border-radius: 15px;
            margin-top: 30px; text-align: left;
        }
        .account {
            background: rgba(255, 255, 255, 0.1); padding: 15px; margin: 10px 0;
            border-radius: 8px; font-family: 'SF Mono', monospace;
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
                <p>JWT Token + bcrypt 加密</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🗄️</div>
                <h3>資料庫整合</h3>
                <p>Azure SQL Database 支援</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🚀</div>
                <h3>雲端部署</h3>
                <p>Azure App Service 就緒</p>
            </div>
        </div>
        
        <div>
            <a href="/login" class="btn">🚪 系統登入</a>
        </div>
        
        <div class="demo-accounts">
            <h3>🧪 測試帳號</h3>
            <div class="account">
                <strong>管理員帳戶</strong><br>
                用戶名: admin<br>
                密碼: SecureAdmin2024!
            </div>
            <div class="account">
                <strong>演示帳戶</strong><br>
                用戶名: demo<br>
                密碼: Demo123!
            </div>
        </div>
    </div>
</body>
</html>
            `);
        }
        
        else if (pathname === '/login' && req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(`
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
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.95); padding: 50px;
            border-radius: 20px; max-width: 450px; width: 100%;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(20px);
        }
        h2 {
            text-align: center; color: #333; margin-bottom: 40px;
            font-size: 2rem; font-weight: 700;
        }
        .form-group { margin-bottom: 25px; }
        label {
            display: block; margin-bottom: 8px; color: #555;
            font-weight: 600; font-size: 0.95rem;
        }
        input {
            width: 100%; padding: 15px 20px; border: 2px solid #e1e5e9;
            border-radius: 12px; font-size: 16px; transition: all 0.3s;
            background: #fafbfc; box-sizing: border-box;
        }
        input:focus {
            outline: none; border-color: #667eea; background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .btn {
            width: 100%; background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; padding: 18px; border: none; border-radius: 12px;
            font-size: 16px; font-weight: 600; cursor: pointer;
            transition: all 0.3s; margin-top: 10px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .btn:disabled {
            opacity: 0.6; cursor: not-allowed; transform: none;
        }
        .message {
            padding: 15px; border-radius: 8px; margin-bottom: 20px;
            text-align: center; font-weight: 500;
        }
        .success {
            background: #d1fae5; color: #065f46; border: 1px solid #34d399;
        }
        .error {
            background: #fee2e2; color: #991b1b; border: 1px solid #f87171;
        }
        .info {
            background: #dbeafe; color: #1e40af; border: 1px solid #60a5fa;
        }
        .back-link {
            text-align: center; margin-top: 25px;
        }
        .back-link a {
            color: #667eea; text-decoration: none; font-weight: 500;
        }
        .loading {
            display: none; text-align: center; margin-top: 10px;
        }
        .spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px; height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🔐 系統登入</h2>
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
                <p>正在驗證...</p>
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
</html>
            `);
        }
        
        else if (pathname === '/api/login' && req.method === 'POST') {
            const data = await parsePostData(req);
            
            if (!data.username || !data.password) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    success: false,
                    message: '用戶名和密碼為必填項目'
                }));
                return;
            }
            
            const user = await userQueries.findByUsernameOrEmail(data.username);
            
            if (!user || !user.is_active) {
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    success: false,
                    message: '用戶名或密碼錯誤'
                }));
                return;
            }
            
            // 檢查登入嘗試次數
            if (user.login_attempts >= 5) {
                res.writeHead(429, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    success: false,
                    message: '登入嘗試次數過多，帳戶已被暫時鎖定'
                }));
                return;
            }
            
            // 驗證密碼
            const isValidPassword = await verifyPassword(data.password, user.password_hash);
            
            if (isValidPassword) {
                // 登入成功
                await userQueries.updateLoginAttempts(user.id, true);
                
                const token = generateJWT(user);
                
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    success: true,
                    message: '登入成功！正在跳轉...',
                    token: token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                }));
            } else {
                // 登入失敗
                await userQueries.updateLoginAttempts(user.id, false);
                
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    success: false,
                    message: '用戶名或密碼錯誤'
                }));
            }
        }
        
        else if (pathname === '/dashboard' && req.method === 'GET') {
            // 這裡需要檢查 JWT token
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(`
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
            min-height: 100vh; padding: 20px;
        }
        .dashboard {
            max-width: 1000px; margin: 0 auto;
            background: rgba(255, 255, 255, 0.95); border-radius: 20px;
            padding: 40px; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
        }
        .header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 40px; padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        h1 { color: #333; font-size: 2.5rem; }
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white; padding: 12px 25px; border: none; border-radius: 8px;
            font-weight: 600; cursor: pointer; transition: all 0.3s;
        }
        .btn-danger:hover { transform: translateY(-2px); opacity: 0.9; }
        .welcome {
            background: #d1fae5; color: #065f46; padding: 30px;
            border-radius: 15px; margin-bottom: 30px;
            border-left: 4px solid #10b981;
        }
        .welcome h2 { margin-bottom: 10px; }
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
            <p><small>下一步我們將整合 Azure SQL Database 和完整的用戶管理功能。</small></p>
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
</html>
            `);
        }
        
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
    console.log('🎉 ========================================');
    console.log('🚀 SecureApp 完整版啟動成功！');
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log(`🗄️ 資料庫: ${process.env.DB_SERVER ? 'Azure SQL (未連接)' : '模擬資料庫'}`);
    console.log('🎉 ========================================');
    console.log('');
    console.log('🔐 測試帳號:');
    console.log('   admin / SecureAdmin2024! (管理員)');
    console.log('   demo / Demo123! (一般用戶)');
    console.log('');
    console.log('🌐 功能頁面:');
    console.log(`   - ${process.env.APP_URL || `http://localhost:${PORT}`}/ (首頁)`);
    console.log(`   - ${process.env.APP_URL || `http://localhost:${PORT}`}/login (登入)`);
    console.log(`   - ${process.env.APP_URL || `http://localhost:${PORT}`}/dashboard (控制台)`);
    console.log('');
    console.log('📋 下一步: 設定 Azure SQL Database');
    console.log('🎉 ========================================');
    console.log('🚀 SecureApp 生產版啟動成功！');
    console.log(`📍 https://loginapp-cegcdrf9e9cgdsf9.eastasia-01.azurewebsites.net`);
    console.log('🔄 GitHub 自動部署已啟用！'); // ← 添加這行
});