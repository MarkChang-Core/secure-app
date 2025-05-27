require('dotenv').config();

console.log('🔧 Azure App Service 環境變數設定：');
console.log('=====================================');
console.log('');
console.log('JWT_SECRET:', process.env.JWT_SECRET || '❌ 未設定');
console.log('DB_SERVER:', process.env.DB_SERVER || '❌ 未設定');
console.log('DB_DATABASE:', process.env.DB_DATABASE || '❌ 未設定');
console.log('DB_USER:', process.env.DB_USER || '❌ 未設定');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD || '❌ 未設定');
console.log('');
console.log('💡 將以上值複製到 Azure App Service 的「應用程式設定」中');