import { defineConfig } from 'vite'
// 移除SSL插件，不再需要
// import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 资源目录
    assetsDir: 'public/assets',
    // 生成sourcemap
    sourcemap: true,
    // 压缩选项
    minify: 'terser',
    // 关闭 brotli 压缩大小报告
    brotliSize: false,
    // 设置为 ES2015 以获得更好的浏览器兼容性
    target: 'es2015'
  },
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    // 关闭HTTPS
    https: false
  },
  // 移除SSL插件
  plugins: [
    // basicSsl()
  ]
}) 