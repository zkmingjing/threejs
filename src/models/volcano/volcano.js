// 火山喷发模型 - 场景、相机和渲染器设置
import * as THREE from 'three';
import { OrbitControls } from '../../libs/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 场景、相机、渲染器和控制器
let scene, camera, renderer, controls;

// 后期处理相关
let composer, bloomPass, shakePass;

// 火山相关对象
let volcano, magmaChamber, conduit, lavaParticles, smokeParticles, ashCloud, rockDebris, conduitFlow, thermalParticles;

// 教学UI相关
let gui, pressureGauge, temperatureGauge, annotations = [];

// 火山状态和参数
const volcanoParams = {
    stage: 'dormant', // dormant, pressure-building, magma-rising, erupting, post-eruption
    pressure: 0,      // 0-100
    temperature: 800, // 摄氏度
    gasContent: 50,   // 0-100
    magmaViscosity: 60, // 0-100
    eruptionIntensity: 0, // 0-100
    crossSectionView: false,
    showAnnotations: true,
    autoDemo: false,
    demoStage: 0,
    pauseDemo: false
};

// 加载管理器
const loadingManager = new THREE.LoadingManager();

// 加载完成时隐藏加载信息
loadingManager.onLoad = function() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
};

// 加载进度更新
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        const percent = (itemsLoaded / itemsTotal * 100).toFixed(0);
        loadingMessage.innerHTML = `正在加载火山模型...<br>${percent}%`;
    }
};

// 加载错误处理
loadingManager.onError = function(url) {
    console.error('加载错误:', url);
    
    // 如果错误是关于star.png的，则不在界面显示
    if (url.includes('star.png')) {
        return; // 忽略star.png的错误
    }
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = `纹理加载错误: ${url}`;
    }
};

// 纹理加载器
const textureLoader = new THREE.TextureLoader(loadingManager);

// 创建动态纹理
function createDynamicTextures() {
    // 1. 创建火山岩石纹理
    const volcanoTexture = createNoiseTexture(512, 512, [0.3, 0.15, 0.1], [0.6, 0.35, 0.2]);
    volcanoTexture.wrapS = THREE.RepeatWrapping;
    volcanoTexture.wrapT = THREE.RepeatWrapping;
    
    // 2. 创建地面纹理
    const groundTexture = createNoiseTexture(1024, 1024, [0.2, 0.15, 0.1], [0.4, 0.3, 0.2]);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    
    // 3. 创建高度图纹理
    const heightMapTexture = createHeightMapTexture(256, 256);
    
    // 4. 创建熔岩流纹理
    const lavaFlowTexture = createLavaTexture(512, 512);
    
    // 5. 创建烟雾纹理
    const smokeTexture = createSmokeTexture(256, 256);
    
    // 6. 创建灰尘粒子纹理
    const ashTexture = createParticleTexture(128, 128, 0.5);
    
    return {
        volcanoTexture,
        groundTexture,
        heightMapTexture,
        lavaFlowTexture,
        smokeTexture,
        ashTexture
    };
}

// 创建基于噪声的纹理
function createNoiseTexture(width, height, minColor, maxColor) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        
        // 创建柏林噪声效果的近似值（简化版）
        const x = i % width;
        const y = Math.floor(i / width);
        
        const noise1 = Math.sin(x * 0.01) * Math.sin(y * 0.01) * 0.5 + 0.5;
        const noise2 = Math.sin(x * 0.02 + 30) * Math.sin(y * 0.02 + 10) * 0.5 + 0.5;
        const noise3 = Math.sin(x * 0.005 - 10) * Math.sin(y * 0.005 - 20) * 0.5 + 0.5;
        
        // 组合多个噪声以创建更自然的外观
        const mixedNoise = (noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1);
        
        // 在最小和最大颜色之间插值
        data[stride] = Math.floor(minColor[0] * 255 + mixedNoise * (maxColor[0] - minColor[0]) * 255);
        data[stride + 1] = Math.floor(minColor[1] * 255 + mixedNoise * (maxColor[1] - minColor[1]) * 255);
        data[stride + 2] = Math.floor(minColor[2] * 255 + mixedNoise * (maxColor[2] - minColor[2]) * 255);
        data[stride + 3] = 255; // 完全不透明
    }
    
    // 创建纹理
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    return texture;
}

// 创建高度图纹理
function createHeightMapTexture(width, height) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    
    // 生成山脉状高度图
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        
        const x = i % width;
        const y = Math.floor(i / width);
        
        // 距离中心的距离
        const centerX = width / 2;
        const centerY = height / 2;
        const distanceToCenter = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
        
        // 创建环形山结构
        const radius = Math.min(width, height) * 0.4;
        let height_value = 0;
        
        if (distanceToCenter < radius) {
            // 中央火山体
            height_value = (1 - distanceToCenter / radius) * 0.8;
            
            // 添加一些噪声
            const noise = Math.sin(x * 0.1) * Math.sin(y * 0.1) * 0.5 + 0.5;
            height_value = height_value * 0.8 + noise * 0.2;
        } else {
            // 外部地区
            height_value = Math.max(0, 0.2 - (distanceToCenter - radius) / (radius * 2));
            
            // 随机小山丘
            const noise = Math.sin(x * 0.05) * Math.sin(y * 0.05) * 0.5 + 0.5;
            height_value = height_value * 0.7 + noise * 0.3 * height_value;
        }
        
        // 设置颜色
        const colorValue = Math.floor(height_value * 255);
        data[stride] = colorValue;
        data[stride + 1] = colorValue;
        data[stride + 2] = colorValue;
        data[stride + 3] = 255;
    }
    
    // 创建纹理
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    return texture;
}

// 创建熔岩纹理
function createLavaTexture(width, height) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        
        const x = i % width;
        const y = Math.floor(i / width);
        
        // 创建熔岩流的流动效果
        const noise1 = Math.sin(x * 0.05) * Math.sin(y * 0.05) * 0.5 + 0.5;
        const noise2 = Math.sin(x * 0.02 + 10) * Math.sin(y * 0.02 + 5) * 0.5 + 0.5;
        
        // 纹理混合
        const mixedNoise = (noise1 * 0.7 + noise2 * 0.3);
        
        // 熔岩是红色和黄色的混合
        const redFactor = 0.8 + mixedNoise * 0.2;
        const greenFactor = mixedNoise * 0.6;
        
        data[stride] = Math.floor(255 * redFactor); // R
        data[stride + 1] = Math.floor(255 * greenFactor); // G
        data[stride + 2] = 0; // B
        data[stride + 3] = 255; // A
    }
    
    // 创建纹理
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    return texture;
}

// 创建烟雾纹理
function createSmokeTexture(width, height) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    
    // 生成云雾状纹理
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        
        const x = i % width;
        const y = Math.floor(i / width);
        
        // 创建径向渐变，中心不透明，边缘透明
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = (x - centerX) / (width / 2);
        const dy = (y - centerY) / (height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 添加一些噪声
        const noise = Math.sin(x * 0.1) * Math.sin(y * 0.1) * 0.5 + 0.5;
        
        // 基于距离的透明度
        let alpha = Math.max(0, 1 - distance);
        alpha = alpha * alpha * (0.7 + noise * 0.3);
        
        // 烟雾是灰色的
        const colorValue = 200 + Math.floor(noise * 55);
        data[stride] = colorValue;
        data[stride + 1] = colorValue;
        data[stride + 2] = colorValue;
        data[stride + 3] = Math.floor(alpha * 255);
    }
    
    // 创建纹理
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    return texture;
}

// 创建粒子纹理
function createParticleTexture(width, height, hardness = 0.3) {
    const size = width * height;
    const data = new Uint8Array(4 * size);
    
    // 生成径向渐变的粒子
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        
        const x = i % width;
        const y = Math.floor(i / width);
        
        // 创建从中心向外的径向渐变
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = (x - centerX) / (width / 2);
        const dy = (y - centerY) / (height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 向内软化
        let alpha = Math.max(0, 1 - distance);
        
        // 调整硬度 - 值越高，中心区域越大
        alpha = Math.pow(alpha, 1 - hardness);
        
        // 设置颜色（白色）
        data[stride] = 255;
        data[stride + 1] = 255;
        data[stride + 2] = 255;
        data[stride + 3] = Math.floor(alpha * 255);
    }
    
    // 创建纹理
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    return texture;
}

// 初始化场景
function init() {
    try {
        console.log('初始化火山模型...');
        
        // 清理可能存在的旧元素
        cleanupExistingElements();
        
        // 清除已显示的star.png错误信息
        const errorMessage = document.getElementById('error-message');
        if (errorMessage && errorMessage.innerHTML.includes('star.png')) {
            errorMessage.style.display = 'none';
        }
        
        // 创建动态纹理
        const textures = createDynamicTextures();
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000033); // 深蓝色背景
        
        // 添加雾效，增加深度感
        scene.fog = new THREE.FogExp2(0x000033, 0.005);

        // 创建相机
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 30, 100);
        camera.lookAt(0, 0, 0);

        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 软阴影
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        document.body.appendChild(renderer.domElement);

        // 添加轨道控制器
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 20;
        controls.maxDistance = 150;
        controls.maxPolarAngle = Math.PI / 2; // 限制相机垂直角度

        // 设置后期处理
        setupPostProcessing();
        
        // 创建光源
        createLights();
        
        // 创建地面
        createGround(textures);
        
        // 创建火山
        createVolcano(textures);
        
        // 创建粒子系统（熔岩、烟雾、火山灰、岩石碎屑）
        createParticleSystems(textures);
        
        // 创建岩浆房和火山通道
        createMagmaChamberAndConduit();
        
        // 创建热力学可视化
        createThermodynamicsVisuals();
        
        // 创建UI界面和控制器
        createUI();
        
        // 添加窗口大小改变的监听器
        window.addEventListener('resize', onWindowResize, false);

        // 开始动画循环
        animate();
        
        console.log('火山场景初始化完成');
    } catch (error) {
        console.error('初始化错误:', error);
        alert('初始化错误: ' + error.message);
    }
}

// 清理可能存在的旧元素，确保初始化时没有残留
function cleanupExistingElements() {
    // 检查是否有旧的GUI元素，如果有则移除
    const oldGui = document.querySelector('.dg.ac');
    if (oldGui && oldGui.parentNode) {
        oldGui.parentNode.removeChild(oldGui);
    }
    
    // 检查是否有旧的标注元素，如果有则移除
    const oldAnnotations = document.querySelectorAll('.annotation');
    if (oldAnnotations.length > 0) {
        oldAnnotations.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 检查是否有旧的压力表/温度表等UI元素
    const oldGauges = document.querySelectorAll('[style*="position: absolute"][style*="right: 20px"]');
    if (oldGauges.length > 0) {
        oldGauges.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 重置所有全局变量
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    composer = null;
    bloomPass = null;
    shakePass = null;
    volcano = null;
    magmaChamber = null;
    conduit = null;
    lavaParticles = null;
    smokeParticles = null;
    ashCloud = null;
    rockDebris = null;
    conduitFlow = null;
    thermalParticles = null;
    gui = null;
    pressureGauge = null;
    temperatureGauge = null;
    annotations = [];
    
    console.log('已清理火山模型旧元素');
}

// 设置后期处理效果
function setupPostProcessing() {
    // 创建效果合成器
    composer = new EffectComposer(renderer);
    
    // 添加渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // 添加辉光效果
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,    // 强度
        0.4,    // 半径
        0.85    // 阈值
    );
    composer.addPass(bloomPass);
    
    // 添加自定义震动效果shader
    const shakeShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "amount": { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float amount;
            varying vec2 vUv;
            
            void main() {
                vec2 p = vUv;
                vec2 offset = 0.01 * vec2(
                    sin(amount * 10.0),
                    cos(amount * 15.0)
                ) * amount;
                vec4 cr = texture2D(tDiffuse, p + offset);
                vec4 cg = texture2D(tDiffuse, p);
                vec4 cb = texture2D(tDiffuse, p - offset);
                gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
            }
        `
    };
    
    shakePass = new ShaderPass(shakeShader);
    shakePass.enabled = false;
    composer.addPass(shakePass);
}

// 创建光源
function createLights() {
    // 环境光 - 暗红色调，模拟火山发光
    const ambientLight = new THREE.AmbientLight(0x330000, 0.5);
    scene.add(ambientLight);
    
    // 平行光 - 模拟月光
    const directionalLight = new THREE.DirectionalLight(0x9999ff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
    
    // 火山口的光源 - 橙红色脉动光
    const volcanoLight = new THREE.PointLight(0xff5500, 2, 60, 1.5);
    volcanoLight.position.set(0, 20, 0);
    scene.add(volcanoLight);
    
    // 岩浆房发光效果
    const magmaChamberLight = new THREE.PointLight(0xff3300, 1.5, 30, 2);
    magmaChamberLight.position.set(0, -15, 0);
    scene.add(magmaChamberLight);
    
    // 存储光源，以便在动画中调整强度
    window.volcanoLight = volcanoLight;
    window.magmaChamberLight = magmaChamberLight;
}

// 创建地面
function createGround(textures) {
    // 获取地面纹理
    const groundTexture = textures.groundTexture;
    groundTexture.repeat.set(5, 5);
    
    // 创建地面几何体和材质
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 128, 128);
    
    // 使用位移贴图创建地形
    const displacementMap = textures.heightMapTexture;
    
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        displacementMap: displacementMap,
        displacementScale: 15,
        bumpMap: groundTexture,
        bumpScale: 1,
        roughness: 0.8,
        metalness: 0.2,
        color: 0x333333
    });
    
    // 创建地面网格
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 水平放置
    ground.position.y = -20;
    ground.receiveShadow = true;
    scene.add(ground);
}

// 创建火山
function createVolcano(textures) {
    // 创建火山的分层结构
    
    // 1. 底层 - 基岩层
    const baseLayerGeometry = new THREE.ConeGeometry(50, 15, 32, 1);
    const baseLayerMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const baseLayer = new THREE.Mesh(baseLayerGeometry, baseLayerMaterial);
    baseLayer.position.y = -15;
    baseLayer.castShadow = true;
    baseLayer.receiveShadow = true;
    scene.add(baseLayer);
    
    // 2. 中层 - 岩层
    const middleLayerGeometry = new THREE.ConeGeometry(40, 35, 32, 1);
    const middleLayerMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const middleLayer = new THREE.Mesh(middleLayerGeometry, middleLayerMaterial);
    middleLayer.position.y = 2.5;
    middleLayer.castShadow = true;
    middleLayer.receiveShadow = true;
    scene.add(middleLayer);
    
    // 3. 上层 - 火山灰层
    const topLayerGeometry = new THREE.ConeGeometry(30, 40, 32, 1);
    
    // 加载火山纹理
    const volcanoTexture = textures.volcanoTexture;
    volcanoTexture.wrapS = THREE.RepeatWrapping;
    volcanoTexture.wrapT = THREE.RepeatWrapping;
    volcanoTexture.repeat.set(2, 2);
    
    // 使用Perlin噪声纹理生成熔岩流纹理
    const lavaFlowTexture = textures.lavaFlowTexture;
    
    const topLayerMaterial = new THREE.MeshStandardMaterial({
        map: volcanoTexture,
        bumpMap: volcanoTexture,
        bumpScale: 2,
        roughness: 0.9,
        metalness: 0.1,
        color: 0x777777,
        displacementMap: volcanoTexture,
        displacementScale: 2
    });
    
    volcano = new THREE.Mesh(topLayerGeometry, topLayerMaterial);
    volcano.position.y = 20;
    volcano.castShadow = true;
    volcano.receiveShadow = true;
    scene.add(volcano);
    
    // 4. 创建火山口
    const craterGeometry = new THREE.CylinderGeometry(8, 15, 10, 32);
    const craterMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        roughness: 0.7,
        metalness: 0.3,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    crater.position.y = 35; // 放在火山顶部
    scene.add(crater);
    
    // 5. 添加熔岩流效果
    const lavaFlowGeometry = new THREE.CylinderGeometry(1, 8, 30, 32, 10, true);
    
    // 创建自定义着色器材质，实现流动熔岩效果
    const lavaFlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            lavaTexture: { value: lavaFlowTexture },
            glowColor: { value: new THREE.Color(0xff5500) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform sampler2D lavaTexture;
            uniform vec3 glowColor;
            varying vec2 vUv;
            
            void main() {
                // 移动纹理以创建流动效果
                vec2 movingUV = vUv + vec2(0.0, -0.2 * time);
                
                // 采样纹理
                vec4 texColor = texture2D(lavaTexture, movingUV);
                
                // 添加脉冲发光效果
                float pulse = 0.5 + 0.5 * sin(time * 2.0);
                vec3 finalColor = mix(texColor.rgb, glowColor, 0.5 * pulse);
                
                gl_FragColor = vec4(finalColor, texColor.a);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const lavaFlow = new THREE.Mesh(lavaFlowGeometry, lavaFlowMaterial);
    lavaFlow.position.y = 25;
    lavaFlow.rotation.x = Math.PI * 0.05; // 稍微倾斜
    scene.add(lavaFlow);
    
    // 存储引用以便在动画中更新
    window.lavaFlow = lavaFlow;
}

// 创建岩浆房和火山通道
function createMagmaChamberAndConduit() {
    // 1. 创建岩浆房（半透明球体）
    const magmaChamberGeometry = new THREE.SphereGeometry(15, 32, 32);
    
    // 使用渐变发光材质
    const magmaChamberMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pressure: { value: 0 }, // 0-1之间的压力值
            innerColor: { value: new THREE.Color(0xff9500) },
            outerColor: { value: new THREE.Color(0xff3300) }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float pressure;
            uniform vec3 innerColor;
            uniform vec3 outerColor;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // 基于位置和时间的噪声
                float noise = sin(vPosition.x * 0.1 + time) * 
                             cos(vPosition.y * 0.1 + time) * 
                             sin(vPosition.z * 0.1 + time);
                
                // 内外颜色混合
                float mixFactor = length(vPosition) / 15.0 + 0.3 * noise;
                vec3 color = mix(innerColor, outerColor, mixFactor);
                
                // 添加基于压力的波动和发光效果
                float pulseIntensity = 0.2 + 0.8 * pressure;
                float pulse = pulseIntensity * (0.8 + 0.2 * sin(time * 3.0 * (1.0 + pressure)));
                color = mix(color, vec3(1.0, 0.8, 0.3), pulse * 0.3);
                
                // 边缘虚化
                float fresnel = 0.3 + 0.7 * pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                
                gl_FragColor = vec4(color, 0.7 * fresnel);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    magmaChamber = new THREE.Mesh(magmaChamberGeometry, magmaChamberMaterial);
    magmaChamber.position.y = -15;
    scene.add(magmaChamber);
    
    // 2. 创建火山通道（使用粒子路径）
    const conduitGeometry = new THREE.CylinderGeometry(2, 5, 45, 20, 10, true);
    
    // 半透明发光材质
    const conduitMaterial = new THREE.MeshPhongMaterial({
        color: 0xff5500,
        emissive: 0xff2200,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    conduit = new THREE.Mesh(conduitGeometry, conduitMaterial);
    conduit.position.y = 12.5; // 岩浆房到火山口中间
    scene.add(conduit);
    
    // 3. 创建岩浆房体积指示器（进度条HUD）
    createPressureGauge();
}

// 创建压力指示仪表盘
function createPressureGauge() {
    // 创建一个HTML元素作为HUD
    const gaugeContainer = document.createElement('div');
    gaugeContainer.style.position = 'absolute';
    gaugeContainer.style.bottom = '20px';
    gaugeContainer.style.right = '20px';
    gaugeContainer.style.width = '200px';
    gaugeContainer.style.background = 'rgba(0, 0, 0, 0.7)';
    gaugeContainer.style.borderRadius = '10px';
    gaugeContainer.style.padding = '10px';
    gaugeContainer.style.color = 'white';
    gaugeContainer.style.fontFamily = 'Arial, sans-serif';
    
    // 压力指示器标题
    const gaugeTitle = document.createElement('div');
    gaugeTitle.innerHTML = '岩浆压力';
    gaugeTitle.style.textAlign = 'center';
    gaugeTitle.style.marginBottom = '5px';
    gaugeContainer.appendChild(gaugeTitle);
    
    // 压力条容器
    const pressureBarContainer = document.createElement('div');
    pressureBarContainer.style.width = '100%';
    pressureBarContainer.style.height = '20px';
    pressureBarContainer.style.background = 'rgba(50, 50, 50, 0.5)';
    pressureBarContainer.style.borderRadius = '5px';
    pressureBarContainer.style.overflow = 'hidden';
    gaugeContainer.appendChild(pressureBarContainer);
    
    // 压力条
    const pressureBar = document.createElement('div');
    pressureBar.style.width = '0%';
    pressureBar.style.height = '100%';
    pressureBar.style.background = 'linear-gradient(to right, yellow, orange, red)';
    pressureBar.style.transition = 'width 0.3s ease-in-out';
    pressureBarContainer.appendChild(pressureBar);
    
    // 压力数值
    const pressureValue = document.createElement('div');
    pressureValue.innerHTML = '0%';
    pressureValue.style.textAlign = 'center';
    pressureValue.style.marginTop = '5px';
    gaugeContainer.appendChild(pressureValue);
    
    // 温度指示器标题
    const tempTitle = document.createElement('div');
    tempTitle.innerHTML = '岩浆温度';
    tempTitle.style.textAlign = 'center';
    tempTitle.style.marginTop = '10px';
    tempTitle.style.marginBottom = '5px';
    gaugeContainer.appendChild(tempTitle);
    
    // 温度条容器
    const tempBarContainer = document.createElement('div');
    tempBarContainer.style.width = '100%';
    tempBarContainer.style.height = '20px';
    tempBarContainer.style.background = 'rgba(50, 50, 50, 0.5)';
    tempBarContainer.style.borderRadius = '5px';
    tempBarContainer.style.overflow = 'hidden';
    gaugeContainer.appendChild(tempBarContainer);
    
    // 温度条
    const tempBar = document.createElement('div');
    tempBar.style.width = '80%'; // 默认温度
    tempBar.style.height = '100%';
    tempBar.style.background = 'linear-gradient(to right, blue, yellow, orange, red)';
    tempBar.style.transition = 'width 0.3s ease-in-out';
    tempBarContainer.appendChild(tempBar);
    
    // 温度数值
    const tempValue = document.createElement('div');
    tempValue.innerHTML = '800°C';
    tempValue.style.textAlign = 'center';
    tempValue.style.marginTop = '5px';
    gaugeContainer.appendChild(tempValue);
    
    // 添加到body
    document.body.appendChild(gaugeContainer);
    
    // 保存引用以便更新
    pressureGauge = {
        container: gaugeContainer,
        bar: pressureBar,
        value: pressureValue
    };
    
    temperatureGauge = {
        bar: tempBar,
        value: tempValue
    };
}

// 创建粒子系统（熔岩、烟雾、火山灰、岩石碎屑）
function createParticleSystems(textures) {
    // 1. 创建岩浆粒子系统
    createLavaParticles();
    
    // 2. 创建烟雾粒子系统 - 传递烟雾纹理
    createSmokeParticles(textures.smokeTexture);
    
    // 3. 创建火山灰云系统 - 传递灰尘纹理
    createAshCloud(textures.ashTexture);
    
    // 4. 创建岩石碎屑粒子系统
    createRockDebris();
    
    // 5. 创建岩浆通道粒子流
    createConduitFlow();
}

// 创建岩浆粒子系统（红色glow+拖尾）
function createLavaParticles() {
    // 创建熔岩粒子
    const lavaParticlesCount = 2000;
    const lavaParticlesGeometry = new THREE.BufferGeometry();
    const lavaParticlesPositions = new Float32Array(lavaParticlesCount * 3);
    const lavaParticlesSizes = new Float32Array(lavaParticlesCount);
    const lavaParticlesVelocities = new Float32Array(lavaParticlesCount * 3);
    const lavaParticlesColors = new Float32Array(lavaParticlesCount * 3);
    
    // 初始化熔岩粒子的位置、大小、速度和颜色
    for (let i = 0; i < lavaParticlesCount; i++) {
        // 粒子在火山口周围随机分布
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        
        lavaParticlesPositions[i * 3] = Math.cos(angle) * radius;
        lavaParticlesPositions[i * 3 + 1] = 40 + (Math.random() * 2); // 从火山口顶部开始
        lavaParticlesPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 随机粒子大小
        lavaParticlesSizes[i] = Math.random() * 2 + 0.5;
        
        // 初始速度（向各个方向喷射）
        lavaParticlesVelocities[i * 3] = (Math.random() - 0.5) * 0.8;
        lavaParticlesVelocities[i * 3 + 1] = Math.random() * 1.5; // 向上的速度分量
        lavaParticlesVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
        
        // 颜色（从亮黄到深红）
        const colorFactor = Math.random();
        lavaParticlesColors[i * 3] = 1.0; // R
        lavaParticlesColors[i * 3 + 1] = 0.3 + 0.6 * colorFactor; // G
        lavaParticlesColors[i * 3 + 2] = 0.0; // B
    }
    
    lavaParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(lavaParticlesPositions, 3));
    lavaParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(lavaParticlesSizes, 1));
    lavaParticlesGeometry.setAttribute('color', new THREE.BufferAttribute(lavaParticlesColors, 3));
    
    // 存储速度数据以便在动画中使用
    lavaParticlesGeometry.userData = {
        velocities: lavaParticlesVelocities
    };
    
    // 创建熔岩粒子的材质 - 使用自定义着色器实现发光效果
    const lavaParticlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            eruptionIntensity: { value: 0.0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            uniform float eruptionIntensity;
            
            void main() {
                vColor = color;
                
                // 粒子大小随喷发强度变化
                float dynamicSize = size * (1.0 + eruptionIntensity);
                
                // 粒子大小随距离变化，实现透视效果
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = dynamicSize * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            uniform float time;
            
            void main() {
                // 计算到粒子中心的距离
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                // 创建柔和的圆形粒子
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                
                // 添加脉动效果
                float pulse = 0.8 + 0.2 * sin(time * 5.0);
                vec3 finalColor = vColor * pulse;
                
                // 应用发光效果
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    // 创建熔岩粒子系统
    lavaParticles = new THREE.Points(lavaParticlesGeometry, lavaParticlesMaterial);
    lavaParticles.visible = false; // 默认不可见，只在喷发时显示
    scene.add(lavaParticles);
}

// 创建烟雾粒子系统（半透明体积雾）
function createSmokeParticles(smokeTexture) {
    // 创建烟雾粒子
    const smokeParticlesCount = 1000;
    const smokeParticlesGeometry = new THREE.BufferGeometry();
    const smokeParticlesPositions = new Float32Array(smokeParticlesCount * 3);
    const smokeParticlesSizes = new Float32Array(smokeParticlesCount);
    const smokeParticlesVelocities = new Float32Array(smokeParticlesCount * 3);
    const smokeParticlesOpacities = new Float32Array(smokeParticlesCount);
    
    // 初始化烟雾粒子的位置、大小、速度和透明度
    for (let i = 0; i < smokeParticlesCount; i++) {
        // 粒子在火山口上方随机分布
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 8;
        
        smokeParticlesPositions[i * 3] = Math.cos(angle) * radius;
        smokeParticlesPositions[i * 3 + 1] = 42 + (Math.random() * 5); // 从火山口上方开始
        smokeParticlesPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 随机粒子大小
        smokeParticlesSizes[i] = Math.random() * 5 + 2;
        
        // 初始速度（主要向上漂移）
        smokeParticlesVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
        smokeParticlesVelocities[i * 3 + 1] = Math.random() * 0.2 + 0.1; // 向上的速度
        smokeParticlesVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        
        // 初始透明度
        smokeParticlesOpacities[i] = Math.random() * 0.5 + 0.2;
    }
    
    smokeParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(smokeParticlesPositions, 3));
    smokeParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(smokeParticlesSizes, 1));
    smokeParticlesGeometry.setAttribute('opacity', new THREE.BufferAttribute(smokeParticlesOpacities, 1));
    
    // 存储速度数据以便在动画中使用
    smokeParticlesGeometry.userData = {
        velocities: smokeParticlesVelocities
    };
    
    // 使用生成的烟雾纹理
    const smokeParticlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            smokeTexture: { value: smokeTexture },
            time: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute float opacity;
            varying float vOpacity;
            
            void main() {
                vOpacity = opacity;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D smokeTexture;
            uniform float time;
            varying float vOpacity;
            
            void main() {
                vec4 texColor = texture2D(smokeTexture, gl_PointCoord);
                
                // 添加时间变化的透明度
                float dynOpacity = vOpacity * (0.7 + 0.3 * sin(time * 0.5));
                
                gl_FragColor = vec4(texColor.rgb, texColor.a * dynOpacity);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    
    // 创建烟雾粒子系统
    smokeParticles = new THREE.Points(smokeParticlesGeometry, smokeParticlesMaterial);
    smokeParticles.visible = false; // 默认不可见，仅在喷发阶段显示
    scene.add(smokeParticles);
}

// 创建火山灰云体积渲染
function createAshCloud(ashTexture) {
    // 火山灰云使用大量小粒子实现体积云效果
    const ashCloudParticlesCount = 3000;
    const ashCloudGeometry = new THREE.BufferGeometry();
    const ashCloudPositions = new Float32Array(ashCloudParticlesCount * 3);
    const ashCloudSizes = new Float32Array(ashCloudParticlesCount);
    const ashCloudVelocities = new Float32Array(ashCloudParticlesCount * 3);
    const ashCloudColors = new Float32Array(ashCloudParticlesCount * 3);
    
    // 初始化火山灰云粒子
    for (let i = 0; i < ashCloudParticlesCount; i++) {
        // 粒子在扇形区域内分布，模拟向上扩散的火山灰
        const height = Math.random() * 40 + 45; // 从火山口上方开始
        const radius = Math.random() * (height - 40) * 0.8; // 半径随高度增加
        const angle = Math.random() * Math.PI * 2;
        
        ashCloudPositions[i * 3] = Math.cos(angle) * radius;
        ashCloudPositions[i * 3 + 1] = height;
        ashCloudPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 粒子大小 - 较小的灰尘颗粒
        ashCloudSizes[i] = Math.random() * 3 + 1;
        
        // 初始速度 - 缓慢向外扩散
        ashCloudVelocities[i * 3] = Math.cos(angle) * (0.05 + Math.random() * 0.1);
        ashCloudVelocities[i * 3 + 1] = 0.05 + Math.random() * 0.1; // 向上漂移
        ashCloudVelocities[i * 3 + 2] = Math.sin(angle) * (0.05 + Math.random() * 0.1);
        
        // 颜色 - 从深灰到浅灰
        const grayValue = 0.2 + Math.random() * 0.3;
        ashCloudColors[i * 3] = grayValue;
        ashCloudColors[i * 3 + 1] = grayValue;
        ashCloudColors[i * 3 + 2] = grayValue;
    }
    
    ashCloudGeometry.setAttribute('position', new THREE.BufferAttribute(ashCloudPositions, 3));
    ashCloudGeometry.setAttribute('size', new THREE.BufferAttribute(ashCloudSizes, 1));
    ashCloudGeometry.setAttribute('color', new THREE.BufferAttribute(ashCloudColors, 3));
    
    // 存储速度数据
    ashCloudGeometry.userData = {
        velocities: ashCloudVelocities
    };
    
    // 使用生成的灰尘纹理
    const ashCloudMaterial = new THREE.PointsMaterial({
        size: 2,
        map: ashTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.NormalBlending
    });
    
    // 创建火山灰云粒子系统
    ashCloud = new THREE.Points(ashCloudGeometry, ashCloudMaterial);
    ashCloud.visible = false; // 默认不可见，喷发后显示
    scene.add(ashCloud);
}

// 创建岩石碎屑粒子系统（棕色mesh粒子）
function createRockDebris() {
    // 岩石碎屑数量
    const rockDebrisCount = 100;
    
    // 创建实例化几何体
    const baseGeometry = new THREE.TetrahedronGeometry(1, 1); // 使用四面体作为基础形状
    const instancedGeometry = new THREE.InstancedBufferGeometry().copy(baseGeometry);
    
    // 实例化属性
    const scales = new Float32Array(rockDebrisCount);
    const offsets = new Float32Array(rockDebrisCount * 3);
    const rotations = new Float32Array(rockDebrisCount * 3);
    const velocities = new Float32Array(rockDebrisCount * 3);
    const colors = new Float32Array(rockDebrisCount * 3);
    
    // 初始化属性
    for (let i = 0; i < rockDebrisCount; i++) {
        // 缩放 - 不同大小的岩石
        scales[i] = Math.random() * 0.8 + 0.5;
        
        // 初始位置 - 在火山口周围
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 4;
        
        offsets[i * 3] = Math.cos(angle) * radius;
        offsets[i * 3 + 1] = 40; // 火山口位置
        offsets[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 随机初始旋转
        rotations[i * 3] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 1] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 2] = Math.random() * Math.PI * 2;
        
        // 初始速度 - 弹道轨迹
        const launchSpeed = Math.random() * 1.0 + 0.5;
        const launchAngle = Math.random() * Math.PI * 0.3; // 发射角度
        
        velocities[i * 3] = Math.cos(angle) * Math.sin(launchAngle) * launchSpeed;
        velocities[i * 3 + 1] = Math.cos(launchAngle) * launchSpeed; // 垂直分量
        velocities[i * 3 + 2] = Math.sin(angle) * Math.sin(launchAngle) * launchSpeed;
        
        // 颜色 - 从棕红到深棕
        const redFactor = 0.5 + Math.random() * 0.3;
        colors[i * 3] = redFactor; // R
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.2; // G
        colors[i * 3 + 2] = 0.1; // B
    }
    
    instancedGeometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));
    instancedGeometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(rotations, 3));
    instancedGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    
    // 存储速度数据
    instancedGeometry.userData = {
        velocities: velocities
    };
    
    // 创建实例化材质
    const rockDebrisMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            attribute float instanceScale;
            attribute vec3 instanceOffset;
            attribute vec3 instanceRotation;
            attribute vec3 instanceColor;
            varying vec3 vColor;
            
            // 旋转函数
            vec3 applyRotation(vec3 position, vec3 rotation) {
                float sinX = sin(rotation.x);
                float cosX = cos(rotation.x);
                float sinY = sin(rotation.y);
                float cosY = cos(rotation.y);
                float sinZ = sin(rotation.z);
                float cosZ = cos(rotation.z);
                
                // 绕X轴旋转
                vec3 rotatedPos = vec3(
                    position.x,
                    position.y * cosX - position.z * sinX,
                    position.y * sinX + position.z * cosX
                );
                
                // 绕Y轴旋转
                rotatedPos = vec3(
                    rotatedPos.x * cosY + rotatedPos.z * sinY,
                    rotatedPos.y,
                    -rotatedPos.x * sinY + rotatedPos.z * cosY
                );
                
                // 绕Z轴旋转
                return vec3(
                    rotatedPos.x * cosZ - rotatedPos.y * sinZ,
                    rotatedPos.x * sinZ + rotatedPos.y * cosZ,
                    rotatedPos.z
                );
            }
            
            void main() {
                vColor = instanceColor;
                
                // 应用缩放和旋转
                vec3 transformed = applyRotation(position * instanceScale, instanceRotation);
                
                // 应用偏移
                vec3 worldPosition = transformed + instanceOffset;
                
                // 投影到屏幕
                gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });
    
    // 创建实例化网格
    rockDebris = new THREE.Mesh(instancedGeometry, rockDebrisMaterial);
    rockDebris.visible = false; // 默认不可见，只在强烈喷发时显示
    scene.add(rockDebris);
}

// 创建岩浆通道粒子流
function createConduitFlow() {
    // 创建通道粒子流，模拟岩浆上升
    const conduitFlowCount = 500;
    const conduitFlowGeometry = new THREE.BufferGeometry();
    const conduitFlowPositions = new Float32Array(conduitFlowCount * 3);
    const conduitFlowSizes = new Float32Array(conduitFlowCount);
    const conduitFlowVelocities = new Float32Array(conduitFlowCount);
    const conduitFlowColors = new Float32Array(conduitFlowCount * 3);
    
    // 初始化通道粒子
    for (let i = 0; i < conduitFlowCount; i++) {
        // 在岩浆通道内的随机位置
        const progress = Math.random(); // 0-1之间的通道进度
        const height = -15 + progress * 55; // 从岩浆房到火山口
        const radius = (Math.random() * 0.8 + 0.2) * (2 + (5-2) * (1-progress)); // 从下到上变窄
        const angle = Math.random() * Math.PI * 2;
        
        conduitFlowPositions[i * 3] = Math.cos(angle) * radius;
        conduitFlowPositions[i * 3 + 1] = height;
        conduitFlowPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 粒子大小
        conduitFlowSizes[i] = Math.random() * 1.5 + 0.5;
        
        // 上升速度 - 越靠近火山口速度越快
        conduitFlowVelocities[i] = 0.1 + progress * 0.2;
        
        // 颜色 - 从黄色到红色的渐变
        conduitFlowColors[i * 3] = 1.0; // R
        conduitFlowColors[i * 3 + 1] = 0.8 - progress * 0.6; // G，从下到上越来越红
        conduitFlowColors[i * 3 + 2] = 0.0; // B
    }
    
    conduitFlowGeometry.setAttribute('position', new THREE.BufferAttribute(conduitFlowPositions, 3));
    conduitFlowGeometry.setAttribute('size', new THREE.BufferAttribute(conduitFlowSizes, 1));
    conduitFlowGeometry.setAttribute('color', new THREE.BufferAttribute(conduitFlowColors, 3));
    
    // 存储速度数据
    conduitFlowGeometry.userData = {
        velocities: conduitFlowVelocities
    };
    
    // 创建通道粒子材质 - 发光效果
    const conduitFlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            flowRate: { value: 0.0 } // 流动速率，与岩浆压力相关
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float flowRate;
            
            void main() {
                vColor = color;
                
                // 粒子大小随流动速率变化
                float dynamicSize = size * (1.0 + flowRate);
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = dynamicSize * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                // 计算到粒子中心的距离
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                // 创建柔和的发光效果
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    // 创建通道粒子系统并赋值给全局变量
    conduitFlow = new THREE.Points(conduitFlowGeometry, conduitFlowMaterial);
    conduitFlow.visible = false; // 默认不可见，在岩浆上升阶段显示
    scene.add(conduitFlow);
}

// 创建热力学可视化
function createThermodynamicsVisuals() {
    // 创建热力图粒子
    createThermalParticles();
    
    // 创建地面震动效果
    setupGroundShakeEffect();
    
    // 创建3D标注系统
    createAnnotationSystem();
}

// 创建热力图粒子
function createThermalParticles() {
    // 热力图粒子数量
    const thermalParticlesCount = 1000;
    const thermalParticlesGeometry = new THREE.BufferGeometry();
    const thermalParticlesPositions = new Float32Array(thermalParticlesCount * 3);
    const thermalParticlesSizes = new Float32Array(thermalParticlesCount);
    const thermalParticlesColors = new Float32Array(thermalParticlesCount * 3);
    
    // 初始化热力图粒子
    for (let i = 0; i < thermalParticlesCount; i++) {
        // 在岩浆房内随机分布
        const radius = Math.random() * 15;
        const theta = Math.random() * Math.PI;
        const phi = Math.random() * Math.PI * 2;
        
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.cos(theta) - 15; // 中心在y=-15
        const z = radius * Math.sin(theta) * Math.sin(phi);
        
        thermalParticlesPositions[i * 3] = x;
        thermalParticlesPositions[i * 3 + 1] = y;
        thermalParticlesPositions[i * 3 + 2] = z;
        
        // 粒子大小
        thermalParticlesSizes[i] = Math.random() * 1.0 + 0.5;
        
        // 颜色 - 根据距离中心的远近确定温度（从黄色到红色）
        const distanceFromCenter = Math.sqrt(x*x + (y+15)*(y+15) + z*z);
        const tempFactor = distanceFromCenter / 15; // 0-1，0表示最热（中心）
        
        thermalParticlesColors[i * 3] = 1.0; // R
        thermalParticlesColors[i * 3 + 1] = tempFactor * 0.8; // G
        thermalParticlesColors[i * 3 + 2] = 0.0; // B
    }
    
    thermalParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(thermalParticlesPositions, 3));
    thermalParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(thermalParticlesSizes, 1));
    thermalParticlesGeometry.setAttribute('color', new THREE.BufferAttribute(thermalParticlesColors, 3));
    
    // 创建热力图粒子材质
    const thermalParticlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pressure: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            uniform float pressure;
            
            void main() {
                vColor = color;
                
                // 粒子大小随压力脉动
                float pulseFactor = 1.0 + 0.3 * sin(time * 5.0 + length(position) * 0.5);
                float dynamicSize = size * (1.0 + pressure * 0.5) * pulseFactor;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = dynamicSize * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                
                gl_FragColor = vec4(vColor, alpha * 0.7);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    // 创建热力图粒子系统并赋值给全局变量
    thermalParticles = new THREE.Points(thermalParticlesGeometry, thermalParticlesMaterial);
    scene.add(thermalParticles);
}

// 设置地面震动效果
function setupGroundShakeEffect() {
    // 使用后期处理的shakePass实现屏幕抖动
    // 已在setupPostProcessing中创建
    
    // 地面顶点位移动画将在动画循环中实现
}

// 创建3D标注系统
function createAnnotationSystem() {
    // 创建标注点和信息卡
    const annotationPoints = [
        { position: new THREE.Vector3(0, 40, 0), label: "火山口", description: "火山喷发的出口，熔岩和火山气体从这里喷出" },
        { position: new THREE.Vector3(0, 20, 0), label: "火山通道", description: "连接岩浆房和火山口的管道，岩浆通过此通道上升" },
        { position: new THREE.Vector3(0, -15, 0), label: "岩浆房", description: "储存高温熔融岩石的地下空腔，火山喷发的源头" },
        { position: new THREE.Vector3(20, 5, 20), label: "火山锥体", description: "由喷发物质堆积形成的圆锥形山体" },
        { position: new THREE.Vector3(-25, 0, 15), label: "地质层", description: "火山内部的岩石层，记录了火山活动的历史" }
    ];
    
    // 创建标注点
    for (let point of annotationPoints) {
        // 创建标注点几何体
        const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point.position);
        
        // 创建HTML标注元素
        const annotationElement = document.createElement('div');
        annotationElement.className = 'annotation';
        annotationElement.style.position = 'absolute';
        annotationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        annotationElement.style.color = 'white';
        annotationElement.style.padding = '10px';
        annotationElement.style.borderRadius = '5px';
        annotationElement.style.fontSize = '14px';
        annotationElement.style.maxWidth = '200px';
        annotationElement.style.transform = 'translate(-50%, -50%)';
        annotationElement.style.pointerEvents = 'none'; // 不阻止鼠标事件
        annotationElement.style.opacity = '0';
        annotationElement.style.transition = 'opacity 0.3s';
        annotationElement.innerHTML = `<strong>${point.label}</strong><br>${point.description}`;
        
        document.body.appendChild(annotationElement);
        
        // 存储标注信息
        annotations.push({
            marker: marker,
            element: annotationElement,
            position: point.position,
            label: point.label,
            description: point.description
        });
        
        // 添加标注点到场景
        scene.add(marker);
        
        // 添加点击事件
        marker.userData = { annotationIndex: annotations.length - 1 };
    }
    
    // 为场景添加点击监听器
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    window.addEventListener('click', function(event) {
        // 计算鼠标位置
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 发射射线
        raycaster.setFromCamera(mouse, camera);
        
        // 检查是否点击了标注点
        const intersects = raycaster.intersectObjects(scene.children);
        
        // 隐藏所有标注
        for (let annotation of annotations) {
            annotation.element.style.opacity = '0';
        }
        
        // 如果点击了标注点，显示对应信息
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData && object.userData.annotationIndex !== undefined) {
                const annotation = annotations[object.userData.annotationIndex];
                
                // 计算标注在屏幕上的位置
                const position = annotation.position.clone();
                position.project(camera);
                
                const x = (position.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(position.y * 0.5) + 0.5) * window.innerHeight;
                
                // 更新标注位置
                annotation.element.style.left = x + 'px';
                annotation.element.style.top = y + 'px';
                annotation.element.style.opacity = '1';
            }
        }
    });
}

// 创建UI界面和控制器
function createUI() {
    // 创建dat.GUI控制器
    gui = new GUI({ width: 300 });
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    
    // 创建火山参数控制文件夹
    const volcanoFolder = gui.addFolder('火山参数');
    
    // 岩浆粘度控制
    volcanoFolder.add(volcanoParams, 'magmaViscosity', 0, 100)
        .name('岩浆粘度')
        .onChange(function(value) {
            // 更新粒子系统属性
            if (lavaParticles && lavaParticles.material.uniforms) {
                // 粘度会影响粒子的速度和大小
                const viscosityFactor = 1 - (value / 100); // 0-1，值越大，流动性越小
                
                // 减慢粒子速度
                const positions = lavaParticles.geometry.attributes.position.array;
                const velocities = lavaParticles.geometry.userData.velocities;
                
                for (let i = 0; i < velocities.length / 3; i++) {
                    velocities[i * 3 + 1] *= viscosityFactor;
                }
            }
        });
    
    // 气体含量控制
    volcanoFolder.add(volcanoParams, 'gasContent', 0, 100)
        .name('气体含量')
        .onChange(function(value) {
            // 气体含量会影响爆发强度和烟雾量
            if (smokeParticles && smokeParticles.visible) {
                const gasContentFactor = value / 100;
                
                // 更新烟雾粒子大小
                const sizes = smokeParticles.geometry.attributes.size.array;
                for (let i = 0; i < sizes.length; i++) {
                    sizes[i] = (Math.random() * 5 + 2) * (1 + gasContentFactor);
                }
                smokeParticles.geometry.attributes.size.needsUpdate = true;
            }
        });
    
    // 喷发强度控制
    volcanoFolder.add(volcanoParams, 'eruptionIntensity', 0, 100)
        .name('喷发强度')
        .onChange(function(value) {
            // 更新所有粒子系统的强度
            const intensity = value / 100;
            
            if (lavaParticles && lavaParticles.material.uniforms) {
                lavaParticles.material.uniforms.eruptionIntensity.value = intensity;
            }
            
            // 控制光源强度
            if (window.volcanoLight) {
                window.volcanoLight.intensity = 2 + intensity * 5;
            }
            
            // 喷发强度很高时显示岩石碎屑
            rockDebris.visible = intensity > 0.7;
        });
    
    // 视图控制文件夹
    const viewFolder = gui.addFolder('视图控制');
    
    // 剖面模式切换
    viewFolder.add(volcanoParams, 'crossSectionView')
        .name('剖面模式')
        .onChange(function(value) {
            // 实现剖面视图
            if (value) {
                // 创建剖切平面
                const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
                
                // 应用剖切平面
                renderer.clippingPlanes = [clipPlane];
                renderer.localClippingEnabled = true;
                
                // 调整相机位置为侧视图
                const currentPosition = camera.position.clone();
                camera.position.set(100, currentPosition.y, 0);
                camera.lookAt(0, 0, 0);
                controls.update();
            } else {
                // 移除剖切平面
                renderer.clippingPlanes = [];
                renderer.localClippingEnabled = false;
            }
        });
    
    // 标注控制
    viewFolder.add(volcanoParams, 'showAnnotations')
        .name('显示标注')
        .onChange(function(value) {
            // 切换标注的可见性
            for (let annotation of annotations) {
                annotation.marker.visible = value;
            }
        });
    
    // 演示控制文件夹
    const demoFolder = gui.addFolder('演示控制');
    
    // 自动演示模式
    demoFolder.add(volcanoParams, 'autoDemo')
        .name('自动演示')
        .onChange(function(value) {
            if (value) {
                // 开始自动演示
                volcanoParams.demoStage = 0;
                startAutoDemoStage(0);
            } else {
                // 停止自动演示，回到休眠状态
                volcanoParams.demoStage = -1;
                setVolcanoStage('dormant');
            }
        });
    
    // 暂停/继续演示
    demoFolder.add(volcanoParams, 'pauseDemo')
        .name('暂停演示')
        .onChange(function(value) {
            // 在演示中控制暂停状态
        });
    
    // 打开文件夹
    volcanoFolder.open();
    viewFolder.open();
    demoFolder.open();
}

// 自动演示阶段控制
function startAutoDemoStage(stageIndex) {
    volcanoParams.demoStage = stageIndex;
    
    // 如果演示被关闭或暂停，不执行操作
    if (!volcanoParams.autoDemo || volcanoParams.pauseDemo) {
        return;
    }
    
    // 根据阶段执行不同的动作
    switch (stageIndex) {
        case 0: // 岩浆形成阶段
            setVolcanoStage('dormant');
            // 显示岩浆房内部热力图
            thermalParticles.visible = true;
            
            // 3秒后进入下一阶段
            setTimeout(() => {
                if (volcanoParams.autoDemo && !volcanoParams.pauseDemo) {
                    startAutoDemoStage(1);
                }
            }, 3000);
            break;
            
        case 1: // 压力累积阶段
            setVolcanoStage('pressure-building');
            
            // 逐渐增加压力
            let pressure = 0;
            const pressureInterval = setInterval(() => {
                if (!volcanoParams.autoDemo || volcanoParams.pauseDemo) {
                    clearInterval(pressureInterval);
                    return;
                }
                
                pressure += 2;
                volcanoParams.pressure = pressure;
                
                // 更新压力显示
                updatePressureGauge(pressure);
                
                // 更新岩浆房材质
                if (magmaChamber && magmaChamber.material.uniforms) {
                    magmaChamber.material.uniforms.pressure.value = pressure / 100;
                }
                
                // 当压力达到60%时进入下一阶段
                if (pressure >= 60) {
                    clearInterval(pressureInterval);
                    startAutoDemoStage(2);
                }
            }, 200);
            break;
            
        case 2: // 岩浆上升阶段
            setVolcanoStage('magma-rising');
            
            // 显示岩浆通道粒子流
            conduitFlow.visible = true;
            
            // 激活震动效果
            shakePass.enabled = true;
            shakePass.uniforms.amount.value = 0.002;
            
            // 继续增加压力
            let risingPressure = volcanoParams.pressure;
            const risingInterval = setInterval(() => {
                if (!volcanoParams.autoDemo || volcanoParams.pauseDemo) {
                    clearInterval(risingInterval);
                    return;
                }
                
                risingPressure += 1;
                volcanoParams.pressure = risingPressure;
                
                // 更新压力显示
                updatePressureGauge(risingPressure);
                
                // 更新岩浆房材质
                if (magmaChamber && magmaChamber.material.uniforms) {
                    magmaChamber.material.uniforms.pressure.value = risingPressure / 100;
                }
                
                // 当压力达到90%时进入喷发阶段
                if (risingPressure >= 90) {
                    clearInterval(risingInterval);
                    startAutoDemoStage(3);
                }
            }, 300);
            break;
            
        case 3: // 爆发阶段
            setVolcanoStage('erupting');
            
            // 显示所有粒子系统
            lavaParticles.visible = true;
            smokeParticles.visible = true;
            rockDebris.visible = true;
            
            // 增强震动效果
            shakePass.uniforms.amount.value = 0.01;
            
            // 设置喷发强度
            volcanoParams.eruptionIntensity = 100;
            
            // 更新控制器
            for (let controller of gui.__controllers) {
                controller.updateDisplay();
            }
            
            // 10秒后转为喷发后阶段
            setTimeout(() => {
                if (volcanoParams.autoDemo && !volcanoParams.pauseDemo) {
                    startAutoDemoStage(4);
                }
            }, 10000);
            break;
            
        case 4: // 喷发后阶段
            setVolcanoStage('post-eruption');
            
            // 隐藏岩浆和岩石碎屑，保留烟雾和火山灰
            lavaParticles.visible = false;
            rockDebris.visible = false;
            ashCloud.visible = true;
            
            // 减弱震动
            shakePass.uniforms.amount.value = 0.003;
            
            // 降低喷发强度
            volcanoParams.eruptionIntensity = 20;
            
            // 压力重置
            volcanoParams.pressure = 10;
            updatePressureGauge(10);
            
            // 更新控制器
            for (let controller of gui.__controllers) {
                controller.updateDisplay();
            }
            
            // 8秒后回到休眠状态
            setTimeout(() => {
                if (volcanoParams.autoDemo && !volcanoParams.pauseDemo) {
                    startAutoDemoStage(0);
                }
            }, 8000);
            break;
    }
}

// 设置火山阶段
function setVolcanoStage(stage) {
    volcanoParams.stage = stage;
    
    // 根据阶段设置不同的可视化状态
    switch (stage) {
        case 'dormant': // 休眠状态
            // 隐藏所有活动粒子系统
            if (lavaParticles) lavaParticles.visible = false;
            if (smokeParticles) smokeParticles.visible = false;
            if (ashCloud) ashCloud.visible = false;
            if (rockDebris) rockDebris.visible = false;
            if (conduitFlow) conduitFlow.visible = false;
            
            // 恢复正常光照
            if (window.volcanoLight) window.volcanoLight.intensity = 2;
            if (window.magmaChamberLight) window.magmaChamberLight.intensity = 1.5;
            
            // 关闭震动效果
            if (shakePass) shakePass.enabled = false;
            break;
            
        case 'pressure-building': // 压力累积阶段
            // 使岩浆房发光效果增强
            if (window.magmaChamberLight) window.magmaChamberLight.intensity = 2.5;
            break;
            
        case 'magma-rising': // 岩浆上升阶段
            // 在createUI函数中处理
            break;
            
        case 'erupting': // 喷发阶段
            // 在createUI函数中处理
            break;
            
        case 'post-eruption': // 喷发后阶段
            // 在createUI函数中处理
            break;
    }
}

// 更新压力指示仪表
function updatePressureGauge(pressure) {
    if (pressureGauge) {
        pressureGauge.bar.style.width = pressure + '%';
        pressureGauge.value.innerHTML = pressure + '%';
        
        // 根据压力改变颜色
        if (pressure < 30) {
            pressureGauge.bar.style.background = 'linear-gradient(to right, yellow, orange)';
        } else if (pressure < 70) {
            pressureGauge.bar.style.background = 'linear-gradient(to right, orange, red)';
        } else {
            pressureGauge.bar.style.background = 'red';
        }
    }
}

// 窗口大小改变时更新
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// 更新熔岩粒子
function updateLavaParticles(time, deltaTime) {
    if (!lavaParticles || !lavaParticles.visible) return;
    
    const positions = lavaParticles.geometry.attributes.position.array;
    const velocities = lavaParticles.geometry.userData.velocities;
    const colors = lavaParticles.geometry.attributes.color.array;
    
    // 获取喷发强度
    const eruptionIntensity = volcanoParams.eruptionIntensity / 100;
    const gravity = -9.8 * deltaTime * 0.05; // 重力效应
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 应用速度和重力
        positions[i * 3] += velocities[i * 3] * eruptionIntensity;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * eruptionIntensity + gravity;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * eruptionIntensity;
        
        // 粒子冷却效应（距离越远越暗）
        const distance = Math.sqrt(
            positions[i * 3] * positions[i * 3] + 
            (positions[i * 3 + 1] - 40) * (positions[i * 3 + 1] - 40) + 
            positions[i * 3 + 2] * positions[i * 3 + 2]
        );
        
        // 根据距离改变颜色（从黄到红再到黑）
        if (distance > 5) {
            const coolFactor = Math.min(1, (distance - 5) / 30);
            colors[i * 3 + 1] = Math.max(0, 0.3 + 0.6 * (1 - coolFactor)); // G减少
        }
        
        // 如果粒子下落到地面以下，重置到火山口
        if (positions[i * 3 + 1] < 0) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 5;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = 40 + (Math.random() * 2);
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            
            // 重置速度
            velocities[i * 3] = (Math.random() - 0.5) * 0.8;
            velocities[i * 3 + 1] = Math.random() * 1.5;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
            
            // 重置颜色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.3 + 0.6 * Math.random();
            colors[i * 3 + 2] = 0.0;
        }
    }
    
    // 更新属性
    lavaParticles.geometry.attributes.position.needsUpdate = true;
    lavaParticles.geometry.attributes.color.needsUpdate = true;
    
    // 更新材质时间
    lavaParticles.material.uniforms.time.value = time;
    lavaParticles.material.uniforms.eruptionIntensity.value = eruptionIntensity;
}

// 更新烟雾粒子
function updateSmokeParticles(time, deltaTime) {
    if (!smokeParticles || !smokeParticles.visible) return;
    
    const positions = smokeParticles.geometry.attributes.position.array;
    const velocities = smokeParticles.geometry.userData.velocities;
    const sizes = smokeParticles.geometry.attributes.size.array;
    const opacities = smokeParticles.geometry.attributes.opacity.array;
    
    // 获取风力因素（可以随时间变化来模拟风向变化）
    const windX = Math.sin(time * 0.1) * 0.05;
    const windZ = Math.cos(time * 0.1) * 0.05;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 应用速度和风力
        positions[i * 3] += velocities[i * 3] + windX;
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2] + windZ;
        
        // 粒子扩散效应（随高度增加）
        const height = positions[i * 3 + 1] - 40; // 相对于火山口的高度
        if (height > 0) {
            // 粒子大小随高度增加
            sizes[i] += deltaTime * 0.1;
            
            // 粒子透明度随高度减少
            opacities[i] = Math.max(0, opacities[i] - deltaTime * 0.02);
        }
        
        // 如果粒子太高或透明度太低，重置到火山口
        if (positions[i * 3 + 1] > 100 || opacities[i] < 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 8;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = 42 + (Math.random() * 5);
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            
            // 重置大小和透明度
            sizes[i] = Math.random() * 5 + 2;
            opacities[i] = Math.random() * 0.5 + 0.2;
            
            // 重置速度
            velocities[i * 3] = (Math.random() - 0.5) * 0.2;
            velocities[i * 3 + 1] = Math.random() * 0.2 + 0.1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
    }
    
    // 更新属性
    smokeParticles.geometry.attributes.position.needsUpdate = true;
    smokeParticles.geometry.attributes.size.needsUpdate = true;
    smokeParticles.geometry.attributes.opacity.needsUpdate = true;
    
    // 更新材质时间
    smokeParticles.material.uniforms.time.value = time;
}

// 更新火山灰云
function updateAshCloud(time, deltaTime) {
    if (!ashCloud || !ashCloud.visible) return;
    
    const positions = ashCloud.geometry.attributes.position.array;
    const velocities = ashCloud.geometry.userData.velocities;
    
    // 获取风力因素
    const windX = Math.sin(time * 0.05) * 0.1;
    const windZ = Math.cos(time * 0.05) * 0.1;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 应用速度和风力
        positions[i * 3] += velocities[i * 3] + windX * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2] + windZ * deltaTime;
        
        // 限制最大高度
        if (positions[i * 3 + 1] > 120) {
            velocities[i * 3 + 1] = -0.02;
        }
        
        // 如果粒子飘得太远，重置
        const distanceFromCenter = Math.sqrt(
            positions[i * 3] * positions[i * 3] + 
            positions[i * 3 + 2] * positions[i * 3 + 2]
        );
        
        if (distanceFromCenter > 150) {
            // 重置到喷口附近
            const height = Math.random() * 40 + 45;
            const radius = Math.random() * (height - 40) * 0.8;
            const angle = Math.random() * Math.PI * 2;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            
            // 重置速度
            velocities[i * 3] = Math.cos(angle) * (0.05 + Math.random() * 0.1);
            velocities[i * 3 + 1] = 0.05 + Math.random() * 0.1;
            velocities[i * 3 + 2] = Math.sin(angle) * (0.05 + Math.random() * 0.1);
        }
    }
    
    // 更新位置
    ashCloud.geometry.attributes.position.needsUpdate = true;
}

// 更新岩石碎屑
function updateRockDebris(time, deltaTime) {
    if (!rockDebris || !rockDebris.visible) return;
    
    const offsets = rockDebris.geometry.getAttribute('instanceOffset');
    const rotations = rockDebris.geometry.getAttribute('instanceRotation');
    const velocities = rockDebris.geometry.userData.velocities;
    
    const gravity = -9.8 * deltaTime * 0.2; // 重力效应
    
    for (let i = 0; i < offsets.count; i++) {
        // 应用速度和重力
        offsets.array[i * 3] += velocities[i * 3];
        offsets.array[i * 3 + 1] += velocities[i * 3 + 1] + gravity;
        offsets.array[i * 3 + 2] += velocities[i * 3 + 2];
        
        // 应用旋转 - 岩石旋转增加真实感
        rotations.array[i * 3] += 0.01;
        rotations.array[i * 3 + 1] += 0.02;
        rotations.array[i * 3 + 2] += 0.015;
        
        // 如果岩石碎屑落到地面以下，重置位置
        if (offsets.array[i * 3 + 1] < 0) {
            // 重置到火山口
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 4;
            
            offsets.array[i * 3] = Math.cos(angle) * radius;
            offsets.array[i * 3 + 1] = 40;
            offsets.array[i * 3 + 2] = Math.sin(angle) * radius;
            
            // 重置速度 - 弹道轨迹
            const launchSpeed = Math.random() * 1.0 + 0.5;
            const launchAngle = Math.random() * Math.PI * 0.3;
            
            velocities[i * 3] = Math.cos(angle) * Math.sin(launchAngle) * launchSpeed;
            velocities[i * 3 + 1] = Math.cos(launchAngle) * launchSpeed;
            velocities[i * 3 + 2] = Math.sin(angle) * Math.sin(launchAngle) * launchSpeed;
        }
    }
    
    // 更新属性
    offsets.needsUpdate = true;
    rotations.needsUpdate = true;
}

// 更新岩浆通道粒子流
function updateConduitFlow(time, deltaTime) {
    if (!conduitFlow || !conduitFlow.visible) return;
    
    const positions = conduitFlow.geometry.attributes.position.array;
    const velocities = conduitFlow.geometry.userData.velocities;
    
    // 获取流动速率，基于岩浆压力
    const flowRate = volcanoParams.pressure / 100;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 只在Y方向上移动（上升）
        positions[i * 3 + 1] += velocities[i] * flowRate;
        
        // 如果粒子到达火山口，重置到岩浆房
        if (positions[i * 3 + 1] > 40) {
            // 重置到岩浆房位置
            const progress = 0; // 通道起始位置
            const height = -15 + progress * 55;
            const radius = (Math.random() * 0.8 + 0.2) * (2 + (5-2) * (1-progress));
            const angle = Math.random() * Math.PI * 2;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
    }
    
    // 更新位置
    conduitFlow.geometry.attributes.position.needsUpdate = true;
    
    // 更新材质流动速率
    conduitFlow.material.uniforms.time.value = time;
    conduitFlow.material.uniforms.flowRate.value = flowRate;
}

// 更新热力图粒子
function updateThermalParticles(time) {
    if (!thermalParticles) return;
    
    // 更新材质时间和压力
    thermalParticles.material.uniforms.time.value = time;
    thermalParticles.material.uniforms.pressure.value = volcanoParams.pressure / 100;
}

// 更新火山震动效果
function updateVolcanoShake(time) {
    if (!shakePass || !shakePass.enabled) return;
    
    // 基于压力的震动强度
    const pressure = volcanoParams.pressure / 100;
    const baseShakeAmount = shakePass.uniforms.amount.value;
    
    // 添加时间变化的微小噪声
    const noiseAmount = Math.sin(time * 20) * Math.cos(time * 15) * 0.2;
    
    // 最终震动量
    shakePass.uniforms.amount.value = baseShakeAmount * (1 + noiseAmount * pressure);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 计算时间和增量时间
    const time = performance.now() * 0.001; // 转换为秒
    const deltaTime = Math.min(0.1, time - (lastTime || time));
    lastTime = time;
    
    // 更新控制器
    controls.update();
    
    // 更新粒子系统
    if (lavaParticles && lavaParticles.visible) {
        updateLavaParticles(time, deltaTime);
    }
    
    if (smokeParticles && smokeParticles.visible) {
        updateSmokeParticles(time, deltaTime);
    }
    
    if (ashCloud && ashCloud.visible) {
        updateAshCloud(time, deltaTime);
    }
    
    if (rockDebris && rockDebris.visible) {
        updateRockDebris(time, deltaTime);
    }
    
    if (conduitFlow && conduitFlow.visible) {
        updateConduitFlow(time, deltaTime);
    }
    
    // 更新热力图粒子
    updateThermalParticles(time);
    
    // 更新火山震动效果
    updateVolcanoShake(time);
    
    // 更新熔岩流动画
    if (window.lavaFlow && window.lavaFlow.material.uniforms) {
        window.lavaFlow.material.uniforms.time.value = time;
    }
    
    // 更新岩浆房效果
    if (magmaChamber && magmaChamber.material.uniforms) {
        magmaChamber.material.uniforms.time.value = time;
    }
    
    // 更新标注位置（如果显示）
    if (volcanoParams.showAnnotations) {
        for (let annotation of annotations) {
            // 计算标注在屏幕上的位置
            const position = annotation.position.clone();
            position.project(camera);
            
            const x = (position.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(position.y * 0.5) + 0.5) * window.innerHeight;
            
            // 仅更新可见标注
            if (annotation.element.style.opacity !== '0') {
                annotation.element.style.left = x + 'px';
                annotation.element.style.top = y + 'px';
            }
        }
    }
    
    // 使用后期处理渲染
    composer.render();
}

// 全局变量，存储上一帧的时间
let lastTime = null;

// 导出初始化函数
export { init }; 