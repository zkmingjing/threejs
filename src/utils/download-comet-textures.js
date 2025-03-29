import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建存放彗星纹理的目录
const texturesDir = path.join(path.resolve(__dirname, '..', '..'), 'textures', 'comet');

// 确保目录存在
if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir, { recursive: true });
}

// NASA的彗星相关纹理 - 使用开放访问的图片链接
const textures = [
    {
        name: 'comet.jpg',
        url: 'https://photojournal.jpl.nasa.gov/jpeg/PIA23868.jpg',
        description: 'NEOWISE彗星（NASA/JPL图片）'
    },
    {
        name: 'tail.jpg',
        url: 'https://photojournal.jpl.nasa.gov/jpeg/PIA24426.jpg',
        description: '彗星尾巴（NASA/JPL图片）'
    },
    {
        name: 'surface.jpg',
        url: 'https://photojournal.jpl.nasa.gov/jpeg/PIA18419.jpg',
        description: '彗星67P表面（NASA/JPL图片）'
    }
];

// 下载函数
function downloadFile(url, filePath, description) {
    console.log(`正在下载 ${path.basename(filePath)} - ${description}...`);
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            // 处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`重定向到: ${response.headers.location}`);
                https.get(response.headers.location, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`HTTP错误! 状态: ${redirectResponse.statusCode}`));
                        return;
                    }
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`纹理 ${path.basename(filePath)} 下载完成！`);
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(filePath, () => {});
                    reject(err);
                });
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP错误! 状态: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`纹理 ${path.basename(filePath)} 下载完成！`);
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filePath, () => {}); // 删除不完整文件
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // 删除不完整文件
            reject(err);
        });
    });
}

// 下载所有纹理
async function downloadTextures() {
    console.log('开始下载NASA彗星纹理...');
    
    for (const texture of textures) {
        const filePath = path.join(texturesDir, texture.name);
        
        if (fs.existsSync(filePath)) {
            console.log(`纹理 ${texture.name} 已存在，跳过下载。`);
            continue;
        }
        
        try {
            await downloadFile(texture.url, filePath, texture.description);
        } catch (error) {
            console.error(`下载 ${texture.name} 失败:`, error);
        }
    }
    
    console.log('NASA彗星纹理下载完成！');
}

// 执行下载
downloadTextures(); 