const bcrypt = require('bcryptjs');

async function generatePasswords() {
    console.log('🔐 生成 bcrypt 密碼雜湊...');
    
    try {
        // 生成管理員密碼雜湊
        const adminHash = await bcrypt.hash('SecureAdmin2024!', 12);
        console.log('管理員密碼雜湊:');
        console.log(adminHash);
        console.log('');
        
        // 生成演示用戶密碼雜湊
        const demoHash = await bcrypt.hash('Demo123!', 12);
        console.log('演示用戶密碼雜湊:');
        console.log(demoHash);
        console.log('');
        
        // 測試驗證
        const adminTest = await bcrypt.compare('SecureAdmin2024!', adminHash);
        const demoTest = await bcrypt.compare('Demo123!', demoHash);
        
        console.log('✅ 驗證測試:');
        console.log('管理員密碼驗證:', adminTest ? '成功' : '失敗');
        console.log('演示密碼驗證:', demoTest ? '成功' : '失敗');
        
    } catch (error) {
        console.error('❌ 生成密碼失敗:', error);
    }
}

generatePasswords();