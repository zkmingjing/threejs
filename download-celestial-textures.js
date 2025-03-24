const https = require('https');
const fs = require('fs');
const path = require('path');

// 创建textures目录（如果不存在）
const texturesDir = path.join(__dirname, 'textures');
if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir);
}

// NASA的星空和彗星纹理URL
const textures = {
    'starfield': 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004895/starmap_2020_4k.jpg',
    'comet': 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004895/comet_67p_4k.jpg'
};

// 下载函数
function downloadTexture(url, filename) {
    const filepath = path.join(texturesDir, filename);
    const file = fs.createWriteStream(filepath);

    https.get(url, response => {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
            });
        } else {
            console.error(`Failed to download ${filename}: ${response.statusCode}`);
            fs.unlink(filepath, () => {}); // 删除未完成的文件
        }
    }).on('error', err => {
        fs.unlink(filepath, () => {}); // 删除未完成的文件
        console.error(`Error downloading ${filename}:`, err.message);
    });
}

// 下载所有纹理
Object.entries(textures).forEach(([name, url]) => {
    const filename = `${name}.jpg`;
    downloadTexture(url, filename);
}); 