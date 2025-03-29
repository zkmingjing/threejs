const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建存放彗星纹理的目录
const texturesDir = path.join(process.cwd(), 'textures', 'comet');

// 确保目录存在
if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir, { recursive: true });
}

// NASA的彗星相关纹理
const textures = [
    {
        name: 'comet.jpg',
        url: 'https://solarsystem.nasa.gov/system/resources/detail_files/1818_comet_67p_node_full_image_2.jpg',
        description: '彗星67P/楚留莫夫-格拉西门克的表面纹理（ESA/Rosetta任务）'
    },
    {
        name: 'tail.jpg',
        url: 'https://solarsystem.nasa.gov/system/resources/detail_files/1077_hubbleborrelly.jpg',
        description: '博雷利彗星的尾巴（哈勃太空望远镜拍摄）'
    }
];

// 下载函数
function downloadFile(url, filePath, description) {
    console.log(`正在下载 ${path.basename(filePath)} - ${description}...`);
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
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