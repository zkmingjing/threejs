// 火山喷发模型 - 场景、相机和渲染器设置
import * as THREE from 'three';
import { OrbitControls } from '../../libs/OrbitControls.js';

let scene, camera, renderer, controls;

// 火山相关对象
let volcano, lavaParticles, smokeParticles;

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
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = `纹理加载错误: ${url}`;
    }
};

// 纹理加载器
const textureLoader = new THREE.TextureLoader(loadingManager);

// 初始化场景
function init() {
    try {
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
        document.body.appendChild(renderer.domElement);

        // 添加轨道控制器
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 20;
        controls.maxDistance = 150;
        controls.maxPolarAngle = Math.PI / 2; // 限制相机垂直角度

        // 创建光源
        createLights();
        
        // 创建地面
        createGround();
        
        // 创建火山
        createVolcano();
        
        // 创建粒子系统（熔岩和烟雾）
        createParticles();
        
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
    
    // 存储火山光源，以便在动画中调整强度
    window.volcanoLight = volcanoLight;
}

// 创建地面
function createGround() {
    // 加载地面纹理
    const groundTexture = textureLoader.load('/src/assets/textures/volcano/volcanic_ground.jpg');
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(5, 5);
    
    // 创建地面几何体和材质
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 32, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        bumpMap: groundTexture,
        bumpScale: 1,
        roughness: 0.8,
        metalness: 0.2,
        color: 0x333333
    });
    
    // 创建地面网格
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 水平放置
    ground.position.y = -10;
    ground.receiveShadow = true;
    scene.add(ground);
}

// 创建火山
function createVolcano() {
    // 加载火山纹理
    const volcanoTexture = textureLoader.load('/src/assets/textures/volcano/volcanic_rock.jpg');
    volcanoTexture.wrapS = THREE.RepeatWrapping;
    volcanoTexture.wrapT = THREE.RepeatWrapping;
    volcanoTexture.repeat.set(2, 2);
    
    // 创建火山几何体 - 使用圆锥体作为基础
    const volcanoGeometry = new THREE.ConeGeometry(40, 60, 32, 4);
    const volcanoMaterial = new THREE.MeshStandardMaterial({
        map: volcanoTexture,
        bumpMap: volcanoTexture,
        bumpScale: 2,
        roughness: 0.9,
        metalness: 0.1,
        color: 0x555555,
        displacementMap: volcanoTexture,
        displacementScale: 5
    });
    
    // 创建火山网格
    volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    volcano.position.y = 20; // 让火山底部接近地面
    volcano.castShadow = true;
    volcano.receiveShadow = true;
    scene.add(volcano);
    
    // 创建火山口
    const craterGeometry = new THREE.CylinderGeometry(10, 20, 10, 32);
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
}

// 创建粒子系统（熔岩和烟雾）
function createParticles() {
    // 创建熔岩粒子
    const lavaParticlesCount = 2000;
    const lavaParticlesGeometry = new THREE.BufferGeometry();
    const lavaParticlesPositions = new Float32Array(lavaParticlesCount * 3);
    const lavaParticlesSizes = new Float32Array(lavaParticlesCount);
    
    // 初始化熔岩粒子的位置和大小
    for (let i = 0; i < lavaParticlesCount; i++) {
        // 粒子在火山口周围随机分布
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        
        lavaParticlesPositions[i * 3] = Math.cos(angle) * radius;
        lavaParticlesPositions[i * 3 + 1] = 40 + (Math.random() * 2); // 从火山口顶部开始
        lavaParticlesPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 随机粒子大小
        lavaParticlesSizes[i] = Math.random() * 2 + 0.5;
    }
    
    lavaParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(lavaParticlesPositions, 3));
    lavaParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(lavaParticlesSizes, 1));
    
    // 创建熔岩粒子的材质 - 使用纯色材质替代纹理
    const lavaParticlesMaterial = new THREE.PointsMaterial({
        size: 2,
        color: 0xff5500,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    
    // 创建熔岩粒子系统
    lavaParticles = new THREE.Points(lavaParticlesGeometry, lavaParticlesMaterial);
    scene.add(lavaParticles);
    
    // 创建烟雾粒子
    const smokeParticlesCount = 1000;
    const smokeParticlesGeometry = new THREE.BufferGeometry();
    const smokeParticlesPositions = new Float32Array(smokeParticlesCount * 3);
    const smokeParticlesSizes = new Float32Array(smokeParticlesCount);
    
    // 初始化烟雾粒子的位置和大小
    for (let i = 0; i < smokeParticlesCount; i++) {
        // 粒子在火山口上方随机分布
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 8;
        
        smokeParticlesPositions[i * 3] = Math.cos(angle) * radius;
        smokeParticlesPositions[i * 3 + 1] = 45 + (Math.random() * 15); // 从火山口上方开始
        smokeParticlesPositions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // 随机粒子大小
        smokeParticlesSizes[i] = Math.random() * 3 + 1;
    }
    
    smokeParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(smokeParticlesPositions, 3));
    smokeParticlesGeometry.setAttribute('size', new THREE.BufferAttribute(smokeParticlesSizes, 1));
    
    // 创建烟雾粒子的材质 - 使用纯色材质替代纹理
    const smokeParticlesMaterial = new THREE.PointsMaterial({
        size: 5,
        color: 0x888888,
        blending: THREE.NormalBlending,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    
    // 创建烟雾粒子系统
    smokeParticles = new THREE.Points(smokeParticlesGeometry, smokeParticlesMaterial);
    scene.add(smokeParticles);
}

// 更新熔岩粒子动画
function updateLavaParticles() {
    const positions = lavaParticles.geometry.attributes.position.array;
    const sizes = lavaParticles.geometry.attributes.size.array;
    
    for (let i = 0; i < positions.length / 3; i++) {
        // 更新Y坐标，让粒子向上移动
        positions[i * 3 + 1] += Math.random() * 0.5;
        
        // 如果粒子移动得太高，则重置回火山口
        if (positions[i * 3 + 1] > 60) {
            positions[i * 3 + 1] = 40;
            
            // 重新分配X和Z坐标，使粒子回到火山口
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 5;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
        
        // 根据高度调整粒子大小，随着上升逐渐缩小
        const height = positions[i * 3 + 1] - 40; // 相对于起始高度的高度
        sizes[i] = Math.max(0.1, 2 - (height / 10)); // 随着高度增加而缩小
    }
    
    // 更新位置和大小属性
    lavaParticles.geometry.attributes.position.needsUpdate = true;
    lavaParticles.geometry.attributes.size.needsUpdate = true;
}

// 更新烟雾粒子动画
function updateSmokeParticles() {
    const positions = smokeParticles.geometry.attributes.position.array;
    const count = positions.length / 3;
    
    for (let i = 0; i < count; i++) {
        // 更新Y坐标，让粒子向上移动
        positions[i * 3 + 1] += 0.1 + Math.random() * 0.1;
        
        // 让粒子水平方向也有轻微随机移动，模拟风的效果
        positions[i * 3] += (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.1;
        
        // 如果粒子移动得太高，则重置回火山口上方
        if (positions[i * 3 + 1] > 80) {
            positions[i * 3 + 1] = 45;
            
            // 重新分配X和Z坐标
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 8;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
    }
    
    // 更新位置属性
    smokeParticles.geometry.attributes.position.needsUpdate = true;
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 火山光源脉动效果
function updateVolcanoLight() {
    // 让火山口的光源强度随机变化，模拟熔岩流动的效果
    const light = window.volcanoLight;
    if (light) {
        light.intensity = 2 + Math.random() * 1.5;
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新粒子系统
    updateLavaParticles();
    updateSmokeParticles();
    
    // 更新火山光源
    updateVolcanoLight();
    
    // 更新控制器
    controls.update();
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 导出初始化函数
export { init }; 