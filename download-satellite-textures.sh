#!/bin/bash

# 创建纹理目录
mkdir -p textures/satellites

# 使用备用的卫星纹理源
# 月球
curl -L "https://www.solarsystemscope.com/textures/download/8k_moon.jpg" -o textures/satellites/moon.jpg

# 火星卫星
curl -L "https://www.solarsystemscope.com/textures/download/2k_phobos.jpg" -o textures/satellites/phobos.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_deimos.jpg" -o textures/satellites/deimos.jpg

# 木星卫星
curl -L "https://www.solarsystemscope.com/textures/download/2k_io.jpg" -o textures/satellites/io.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_europa.jpg" -o textures/satellites/europa.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_ganymede.jpg" -o textures/satellites/ganymede.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_callisto.jpg" -o textures/satellites/callisto.jpg

# 土星卫星
curl -L "https://www.solarsystemscope.com/textures/download/2k_titan.jpg" -o textures/satellites/titan.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_rhea.jpg" -o textures/satellites/rhea.jpg

# 天王星卫星
curl -L "https://www.solarsystemscope.com/textures/download/2k_titania.jpg" -o textures/satellites/titania.jpg
curl -L "https://www.solarsystemscope.com/textures/download/2k_oberon.jpg" -o textures/satellites/oberon.jpg

# 海王星卫星
curl -L "https://www.solarsystemscope.com/textures/download/2k_triton.jpg" -o textures/satellites/triton.jpg

# 处理下载的图片
for file in textures/satellites/*.jpg; do
    # 调整图片大小为1024x512并优化质量
    convert "$file" -resize 1024x512! -quality 90 "${file%.jpg}_temp.jpg"
    mv "${file%.jpg}_temp.jpg" "$file"
done

echo "卫星纹理下载和处理完成！" 