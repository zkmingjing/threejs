const https = require('https');
const fs = require('fs');
const path = require('path');

// 创建textures目录
const texturesDir = path.join(__dirname, 'textures');
if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir);
}

// 定义纹理URL
const textures = {
    'sun.jpg': 'https://i.imgur.com/XVMc6zD.jpg',
    'mercury.jpg': 'https://i.imgur.com/XIrtxXj.jpg',
    'venus.jpg': 'https://i.imgur.com/7GkE9eT.jpg',
    'earth.jpg': 'https://i.imgur.com/WqlxZtK.jpg',
    'mars.jpg': 'https://i.imgur.com/P5LU8Zs.jpg',
    'jupiter.jpg': 'https://i.imgur.com/k29VZlg.jpg',
    'saturn.jpg': 'https://i.imgur.com/pEj8Z5B.jpg',
    'saturn-rings.png': 'https://i.imgur.com/HtGkqaJ.png',
    'uranus.jpg': 'https://i.imgur.com/G5gOZbf.jpg',
    'neptune.jpg': 'https://i.imgur.com/WlYVqJN.jpg',
    'moon.jpg': 'https://i.imgur.com/b8nQ8Kc.jpg'
};

// 下载文件函数
function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(texturesDir, filename);
        const file = fs.createWriteStream(filePath);
        
        https.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
            });
            
            file.on('error', err => {
                fs.unlink(filePath, () => {});
                reject(err);
            });
        }).on('error', err => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

// 下载所有纹理
async function downloadTextures() {
    console.log('开始下载纹理文件...');
    for (const [filename, url] of Object.entries(textures)) {
        try {
            console.log(`正在下载: ${filename}`);
            await downloadFile(url, filename);
        } catch (error) {
            console.error(`Error downloading ${filename}:`, error.message);
        }
    }
    console.log('所有纹理下载完成！');
}

downloadTextures(); 