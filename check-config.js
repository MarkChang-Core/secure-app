require('dotenv').config();

console.log('🔧 環境變數檢查');
console.log('=================');

// JWT 設定
const jwtSecret = process.env.JWT_SECRET;
console.log('✅ JWT_SECRET:', jwtSecret ? `設定完成 (${jwtSecret.length} 字符)` : '❌ 未設定');

// 資料庫設定
console.log('✅ DB_SERVER:', process.env.DB_SERVER || '❌ 未設定');
console.log('✅ DB_DATABASE:', process.env.DB_DATABASE || '❌ 未設定');
console.log('✅ DB_USER:', process.env.DB_USER || '❌ 未設定');
console.log('✅ DB_PASSWORD:', process.env.DB_PASSWORD ? '設定完成' : '❌ 未設定');

console.log('');
console.log('🎯 Azure App Service 環境變數設定：');
console.log('');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`DB_SERVER=${process.env.DB_SERVER}`);
console.log(`DB_DATABASE=${process.env.DB_DATABASE}`);
console.log(`DB_USER=${process.env.DB_USER}`);
console.log(`DB_PASSWORD=${process.env.DB_PASSWORD}`);
console.log('NODE_ENV=production');
console.log('WEBSITE_NODE_DEFAULT_VERSION=~20');