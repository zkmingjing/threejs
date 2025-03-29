# 3D模型展示项目

这是一个基于Three.js的3D模型展示Web应用，包含多个不同的模型场景。

## 项目结构

```
|- src/                    # 源代码目录
|  |- assets/              # 资源文件
|  |  |- textures/         # 纹理图片
|  |     |- planets/       # 行星纹理
|  |     |- satellites/    # 卫星纹理
|  |     |- volcano/       # 火山纹理
|  |- libs/                # 第三方库
|  |  |- three.min.js      # Three.js库
|  |  |- OrbitControls.js  # 轨道控制器
|  |- models/              # 模型模块
|  |  |- solar-system/     # 太阳系模型
|  |  |  |- solar-system.js # 太阳系场景
|  |  |  |- planets.js     # 行星相关组件
|  |  |- volcano/          # 火山喷发模型
|  |     |- volcano.js     # 火山场景
|  |- utils/               # 工具函数
|  |- main.js              # 主入口文件
|
|- public/                 # 公共资源目录
|  |- index.html           # 入口HTML
|  |- css/                 # CSS样式
|  |- js/                  # 公共JS脚本
|
|- package.json            # 项目配置
|- vite.config.js          # Vite配置
```

## 使用方法

1. 安装依赖
```
npm install
```

2. 启动开发服务器
```
npm run dev
```

3. 构建生产版本
```
npm run build
```

## 功能特性

- 支持多种3D模型的切换展示
- 模型1：太阳系行星展示
  - 真实比例的太阳系行星
  - 行星自转和公转动画
  - 行星卫星系统
  - 可交互的行星信息查看
  
- 模型2：火山喷发模拟
  - 火山地貌
  - 熔岩粒子特效
  - 烟雾粒子效果
  - 光源动态变化