import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义存放卫星纹理图的目录
const satellitesDir = path.join(__dirname, '../../public/assets/textures/satellites');

// 确保目录存在
if (!fs.existsSync(satellitesDir)) {
    fs.mkdirSync(satellitesDir, { recursive: true });
    console.log(`创建目录: ${satellitesDir}`);
}

// 卫星纹理URL列表（使用更可靠的在线资源）
const textures = [
    // 月球已通过复制的方式获取，跳过下载
    
    // 其他卫星纹理
    {
        name: 'io.jpg', 
        url: 'https://i.imgur.com/IQ4tQJl.jpg', // 木卫一高质量纹理
        description: '木卫一(Io)高清纹理'
    },
    {
        name: 'europa.jpg',
        url: 'https://i.imgur.com/V908i4Y.jpg', // 木卫二高质量纹理
        description: '木卫二(Europa)高清纹理'
    },
    {
        name: 'ganymede.jpg',
        url: 'https://i.imgur.com/xgNzPP0.jpg', // 木卫三高质量纹理
        description: '木卫三(Ganymede)高清纹理'
    },
    {
        name: 'callisto.jpg',
        url: 'https://i.imgur.com/3Wavr22.jpg', // 木卫四高质量纹理
        description: '木卫四(Callisto)高清纹理'
    },
    {
        name: 'titan.jpg',
        url: 'https://i.imgur.com/xRSu0oC.jpg', // 土卫六高质量纹理
        description: '土卫六(Titan)高清纹理'
    },
    {
        name: 'enceladus.jpg',
        url: 'https://i.imgur.com/17VdqgD.jpg', // 土卫二高质量纹理
        description: '土卫二(Enceladus)高清纹理'
    }
];

// 如果月球纹理不存在，则创建一个默认的（作为备用方案）
const moonPath = path.join(satellitesDir, 'moon.jpg');
if (!fs.existsSync(moonPath)) {
    console.log('月球纹理不存在，添加到下载列表');
    textures.unshift({
        name: 'moon.jpg',
        url: 'https://i.imgur.com/vpZwxrA.jpg', // 月球高质量纹理
        description: '月球高清纹理'
    });
} else {
    console.log('月球纹理已存在，跳过下载');
}

// 下载函数
function downloadTexture(texture) {
    const filepath = path.join(satellitesDir, texture.name);
    const file = fs.createWriteStream(filepath);

    console.log(`开始下载: ${texture.name} (${texture.description})`);

    https.get(texture.url, response => {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`下载完成: ${texture.name}`);
            });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
            // 处理重定向
            console.log(`重定向到: ${response.headers.location}`);
            https.get(response.headers.location, redirectResponse => {
                if (redirectResponse.statusCode !== 200) {
                    console.error(`重定向后下载失败 ${texture.name}: ${redirectResponse.statusCode}`);
                    fs.unlink(filepath, () => {});
                    return;
                }
                redirectResponse.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`下载完成: ${texture.name}`);
                });
            }).on('error', err => {
                fs.unlink(filepath, () => {});
                console.error(`重定向后下载错误 ${texture.name}:`, err.message);
            });
        } else {
            console.error(`下载失败 ${texture.name}: ${response.statusCode}`);
            fs.unlink(filepath, () => {}); // 删除未完成的文件
        }
    }).on('error', err => {
        fs.unlink(filepath, () => {}); // 删除未完成的文件
        console.error(`下载错误 ${texture.name}:`, err.message);
    });
}

// 开始下载所有纹理
console.log('开始下载卫星纹理图...');
textures.forEach(texture => {
    downloadTexture(texture);
}); 