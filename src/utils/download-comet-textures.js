import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建存放彗星纹理的目录
const texturesDir = path.join(path.resolve(__dirname, '..', '..'), 'public/assets/textures/comet');

// 确保目录存在
if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir, { recursive: true });
    console.log(`创建目录: ${texturesDir}`);
}

// 彗星相关纹理 - 使用更可靠的资源
const textures = [
    {
        name: 'comet.jpg',
        url: 'https://www.solarsystemscope.com/textures/download/2k_ceres_fictional.jpg', // 使用谷神星作为替代
        description: '彗星表面纹理（基于小行星）'
    },
    {
        name: 'tail.jpg',
        url: 'https://img.freepik.com/free-photo/beautiful-shining-stars-night-sky_181624-622.jpg',
        description: '彗星尾巴效果纹理'
    },
    {
        name: 'surface.jpg',
        url: 'https://www.solarsystemscope.com/textures/download/2k_eris_fictional.jpg', // 使用阋神星作为替代
        description: '彗星表面细节纹理'
    }
];

// 下载函数
function downloadTexture(texture) {
    const filepath = path.join(texturesDir, texture.name);
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
console.log('开始下载彗星纹理图...');
textures.forEach(texture => {
    downloadTexture(texture);
}); 