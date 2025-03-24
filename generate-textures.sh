#!/bin/bash

# 创建textures目录
mkdir -p textures

# 太阳 - 橙黄色带有渐变和耀斑效果
magick -size 1024x512 \
    gradient:#FF4500-#FFD700 \
    -swirl 20 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x3 \
    textures/sun.jpg

# 水星 - 灰褐色带有陨石坑纹理
magick -size 1024x512 \
    gradient:#8B4513-#A0522D \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x1 \
    -motion-blur 0x2+45 \
    -contrast-stretch 0x50% \
    textures/mercury.jpg

# 金星 - 黄褐色带有云纹理
magick -size 1024x512 \
    gradient:#DAA520-#CD853F \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x3 \
    -swirl 10 \
    -contrast-stretch 0x30% \
    textures/venus.jpg

# 地球 - 蓝绿色带有云纹理
magick -size 1024x512 \
    gradient:#4169E1-#2E8B57 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x2 \
    -swirl 5 \
    -contrast-stretch 0x40% \
    textures/earth.jpg

# 火星 - 红色带有极地冰盖
magick -size 1024x512 \
    gradient:#8B0000-#A52A2A \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x1 \
    -contrast-stretch 0x50% \
    textures/mars.jpg

# 木星 - 棕色带状纹理
magick -size 1024x512 \
    gradient:#DEB887-#8B4513 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x2 \
    -wave 5x50 \
    -contrast-stretch 0x40% \
    textures/jupiter.jpg

# 土星 - 米黄色带状纹理
magick -size 1024x512 \
    gradient:#F4A460-#DEB887 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x2 \
    -wave 3x30 \
    -contrast-stretch 0x40% \
    textures/saturn.jpg

# 土星环 - 透明环带效果
magick -size 1024x256 xc:transparent \
    -fill "rgba(255,255,255,0.5)" \
    -draw "rectangle 0,0 1024,256" \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x1 \
    textures/saturn-rings.png

# 天王星 - 浅蓝色带有条纹
magick -size 1024x512 \
    gradient:#87CEEB-#4682B4 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x2 \
    -wave 2x20 \
    -contrast-stretch 0x40% \
    textures/uranus.jpg

# 海王星 - 深蓝色带有大气斑点
magick -size 1024x512 \
    gradient:#000080-#4169E1 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x3 \
    -wave 4x40 \
    -contrast-stretch 0x40% \
    textures/neptune.jpg

# 月球 - 灰色带有陨石坑纹理
magick -size 512x512 \
    gradient:#808080-#A9A9A9 \
    -attenuate 0.5 +noise Gaussian \
    -blur 0x1 \
    -contrast-stretch 0x60% \
    textures/moon.jpg

echo "所有纹理生成完成！" 