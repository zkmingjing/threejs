import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 资源目录
    assetsDir: 'assets',
    // 生成sourcemap
    sourcemap: true,
    // 压缩选项
    minify: 'terser',
    // 分块策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 将three.js相关代码单独打包
          three: ['three'],
          // 将其他依赖打包
          vendor: ['three']
        }
      }
    }
  },
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    https: true
  },
  // 插件配置
  plugins: [
    basicSsl()
  ]
}) 