/**
 * 主入口文件
 * 
 * 负责初始化Three.js应用并引导应用程序
 * 处理不同模型的加载和切换
 */

// 导入必要的模块
import * as THREE from 'three';
import { OrbitControls } from './libs/OrbitControls.js';

// 导入各个模型的初始化函数
import * as SolarSystem from './models/solar-system/solar-system.js';
import * as Volcano from './models/volcano/volcano.js';

// 当前加载的模型
let currentModel = null;
let currentRenderer = null;

// 主函数
function main() {
    console.log('3D模型展示应用启动');
    
    // 获取模型选择下拉框
    const modelSelect = document.getElementById('model-select');
    
    // 加载默认模型（太阳系）
    loadModel(modelSelect.value);
    
    // 添加下拉框变化监听器
    modelSelect.addEventListener('change', function(event) {
        loadModel(event.target.value);
    });
}

/**
 * 加载指定的模型
 * @param {string} modelName - 要加载的模型名称
 */
function loadModel(modelName) {
    console.log(`加载模型: ${modelName}`);
    
    // 如果当前有渲染器在运行，先移除它
    if (currentRenderer) {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            document.body.removeChild(canvas);
        }
    }
    
    // 重置当前模型和渲染器
    currentModel = null;
    currentRenderer = null;
    
    // 根据模型名称加载相应的模型
    switch (modelName) {
        case 'solar-system':
            // 加载太阳系模型
            SolarSystem.init();
            currentModel = 'solar-system';
            break;
            
        case 'volcano':
            // 加载火山喷发模型
            Volcano.init();
            currentModel = 'volcano';
            break;
            
        default:
            console.error(`未知模型: ${modelName}`);
            break;
    }
    
    // 更新页面标题
    updatePageTitle(modelName);
}

/**
 * 更新页面标题
 * @param {string} modelName - 当前加载的模型名称
 */
function updatePageTitle(modelName) {
    let title = '3D模型展示';
    
    switch (modelName) {
        case 'solar-system':
            title += ' - 太阳系';
            break;
            
        case 'volcano':
            title += ' - 火山喷发';
            break;
    }
    
    document.title = title;
}

// 页面加载后执行主函数
window.addEventListener('DOMContentLoaded', main); 