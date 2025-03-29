// 导入必要的THREE库
import * as THREE from 'three';
import { OrbitControls } from '../../libs/OrbitControls.js';
import * as PlanetsModule from './planets.js';

// 定义场景、相机和渲染器
let scene, camera, renderer, controls;

// 定义太阳系天体
let sun, planets = {};

// 定义行星数据
const planetData = {
    mercury: { 
        radius: 0.383,
        distance: 8,        // 调整距离
        speed: 0.04,
        textureUrl: '/assets/textures/planets/mercury.jpg',
        color: 0x93764C,
        satellites: [],
        info: "水星是太阳系最小的行星，也是距离太阳最近的行星。表面布满撞击坑，没有大气层。"
    },
    venus: { 
        radius: 0.949, 
        distance: 15,       // 调整距离
        speed: 0.03,
        textureUrl: '/assets/textures/planets/venus.jpg',
        color: 0xE6B87C,
        satellites: [],
        info: "金星是太阳系中最热的行星，表面温度可达460°C，拥有厚重的二氧化碳大气层。"
    },
    earth: { 
        radius: 1, 
        distance: 25,       // 调整距离
        speed: 0.025,
        textureUrl: '/assets/textures/planets/earth.jpg',
        color: 0x6B93D6,
        satellites: [
            {
                name: 'moon',
                radius: 0.273,
                distance: 2,
                speed: 0.05,
                textureUrl: '/assets/textures/satellites/moon.jpg',
                color: 0xCCCCCC,
                info: "月球是地球唯一的天然卫星，对地球的潮汐有重要影响。"
            }
        ],
        info: "地球是太阳系中唯一已知存在生命的行星，表面有71%的水覆盖，拥有适宜生命存在的大气层。"
    },
    mars: { 
        radius: 0.532, 
        distance: 35,       // 调整距离
        speed: 0.02,
        textureUrl: '/assets/textures/planets/mars.jpg',
        color: 0xC1440E,
        satellites: [],
        info: "火星被称为红色星球，表面有明显的极冠和峡谷系统，曾经可能有过液态水。"
    },
    jupiter: { 
        radius: 11.209, 
        distance: 48,       // 调整距离
        speed: 0.015,
        textureUrl: '/assets/textures/planets/jupiter.jpg',
        color: 0xC88B3A,
        satellites: [
            {
                name: 'io',
                radius: 0.286,
                distance: 3,
                speed: 0.04,
                textureUrl: '/assets/textures/satellites/io.jpg',
                color: 0xFFFF00,
                info: "木卫一(Io)是太阳系中火山活动最活跃的天体。"
            },
            {
                name: 'europa',
                radius: 0.245,
                distance: 4,
                speed: 0.035,
                textureUrl: '/assets/textures/satellites/europa.jpg',
                color: 0xCCCCCC,
                info: "木卫二(Europa)表面覆盖冰层，下面可能有液态水海洋。"
            }
        ],
        info: "木星是太阳系最大的行星，主要由氢和氦组成，有明显的条纹和大红斑。"
    },
    saturn: { 
        radius: 9.449, 
        distance: 67,       // 调整距离
        speed: 0.01,
        textureUrl: '/assets/textures/planets/saturn.jpg',
        ringUrl: '/assets/textures/planets/saturn-rings.png',
        color: 0xEAD6B8,
        satellites: [],
        info: "土星以其壮观的环系统而闻名，主要由冰粒子组成，有超过80颗已知卫星。"
    },
    uranus: { 
        radius: 4.007, 
        distance: 87,       // 调整距离
        speed: 0.008,
        textureUrl: '/assets/textures/planets/uranus.jpg',
        color: 0x82B3D1,
        satellites: [],
        info: "天王星是太阳系中唯一一个几乎侧卧旋转的行星，有27颗已知卫星。"
    },
    neptune: { 
        radius: 3.883, 
        distance: 100,      // 调整距离
        speed: 0.006,
        textureUrl: '/assets/textures/planets/neptune.jpg',
        color: 0x2B55D3,
        satellites: [],
        info: "海王星是太阳系中风速最高的行星，有明显的大暗斑和强烈的风暴系统。"
    }
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
        loadingMessage.innerHTML = `正在加载太阳系纹理...<br>${percent}%`;
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

const textureLoader = new THREE.TextureLoader(loadingManager);

// 定义彗星类
class Comet {
    constructor(scene) {
        console.log('正在创建彗星...');
        
        // 保存场景引用
        this.scene = scene;
        
        // 彗星组
        this.group = new THREE.Group();
        
        // 彗星本体 - 尝试加载彗星表面纹理
        const cometGeometry = new THREE.SphereGeometry(4, 32, 32);
        
        // 尝试加载彗星表面纹理
        let cometTexture;
        try {
            cometTexture = textureLoader.load('/assets/textures/comet/surface.jpg');
            console.log('彗星表面纹理加载成功');
        } catch (error) {
            console.warn('无法加载彗星表面纹理，使用程序生成的纹理代替', error);
            cometTexture = this.generateCometTexture();
        }
        
        // 使用更亮、更丰富的材质
        const cometMaterial = new THREE.MeshStandardMaterial({ 
            map: cometTexture,
            bumpScale: 0.1,
            roughness: 0.7,
            metalness: 0.1,
            emissive: 0x445566,
            emissiveIntensity: 0.3,
            color: 0xaabbcc  // 添加基础颜色，防止材质完全黑色
        });
        
        this.body = new THREE.Mesh(cometGeometry, cometMaterial);
        this.group.add(this.body);
        
        // 彗星尾巴 - 尝试加载彗星尾巴纹理
        const tailGeometry = new THREE.ConeGeometry(5, 60, 32);
        
        // 尝试加载彗星尾巴纹理
        let tailTexture;
        try {
            tailTexture = textureLoader.load('/assets/textures/comet/tail.jpg');
            console.log('彗星尾巴纹理加载成功');
        } catch (error) {
            console.warn('无法加载彗星尾巴纹理，使用程序生成的纹理代替', error);
            tailTexture = this.generateTailTexture();
        }
        
        const tailMaterial = new THREE.MeshPhongMaterial({
            map: tailTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            emissive: 0x6688aa,
            emissiveIntensity: 0.8,
            color: 0x88aadd  // 添加基础颜色
        });
        
        this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
        this.tail.rotation.x = Math.PI / 2;
        this.tail.position.z = -30;
        this.group.add(this.tail);
        
        // 添加彗星光晕效果
        const glowGeometry = new THREE.SphereGeometry(7, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4499ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.glow);
        
        // 椭圆轨道参数 - 使用更明显的椭圆
        this.a = 80;          // 半长轴增大，使轨道更大
        this.b = 40;          // 半短轴
        this.e = 0.7;         // 离心率增大，使轨道更明显为椭圆
        this.period = 30;     // 周期（秒）增大，减慢速度
        this.startTime = Date.now();
        
        // 添加调试信息 - 移到前面创建
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5); // 减小调试标记大小
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        this.debugMarker = new THREE.Mesh(geometry, material);
        this.debugMarker.visible = false; // 默认隐藏调试标记
        this.scene.add(this.debugMarker);
        
        // 创建一个明显的椭圆轨道
        this.createOrbit();
        
        // 初始位置 - 移到最后调用
        this.updatePosition(0);
        
        // 粒子系统 - 为彗星添加尾部粒子效果
        this.createParticleSystem();
        
        console.log('彗星创建完成');
    }
    
    // 程序生成彗星表面纹理
    generateCometTexture() {
        // 创建一个canvas用于生成纹理
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // 绘制彗星表面 - 灰色基础
        context.fillStyle = '#445566';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加纹理细节 - 更多的岩石特征和明暗变化
        for (let i = 0; i < 5000; i++) {
            // 随机位置
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            
            // 随机大小和颜色
            const size = Math.random() * 4 + 1;
            const brightness = Math.floor(Math.random() * 40 + 30);
            const color = `rgb(${brightness + 35}, ${brightness + 40}, ${brightness + 45})`;
            
            // 绘制小圆点模拟岩石和撞击坑
            context.fillStyle = color;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // 添加一些较大的撞击坑
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 20 + 5;
            
            // 绘制环形撞击坑
            context.fillStyle = '#334455';
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
            
            // 添加撞击坑边缘
            context.strokeStyle = '#556677';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.stroke();
            
            // 添加撞击坑中心
            context.fillStyle = '#223344';
            context.beginPath();
            context.arc(x, y, radius * 0.6, 0, Math.PI * 2);
            context.fill();
        }
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    // 程序生成彗星尾部纹理
    generateTailTexture() {
        // 创建一个canvas用于生成纹理
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // 设置渐变背景
        const gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(100, 150, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(80, 120, 220, 0.5)');
        gradient.addColorStop(1, 'rgba(60, 100, 180, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加尾巴纹理细节
        for (let i = 0; i < 1000; i++) {
            // 越接近中心，密度越大
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * canvas.width / 2;
            
            const x = canvas.width / 2 + Math.cos(angle) * distance;
            const y = canvas.height / 2 + Math.sin(angle) * distance;
            
            // 亮度随距离减弱
            const alpha = 1 - (distance / (canvas.width / 2));
            const size = Math.random() * 2 + 0.5;
            
            context.fillStyle = `rgba(200, 220, 255, ${alpha * 0.6})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        
        return texture;
    }
    
    // 为彗星添加粒子系统尾巴效果
    createParticleSystem() {
        // 粒子数量
        const particleCount = 2000;
        
        // 粒子几何体
        const particles = new THREE.BufferGeometry();
        
        // 粒子位置数组
        const positions = new Float32Array(particleCount * 3);
        
        // 粒子尺寸数组
        const sizes = new Float32Array(particleCount);
        
        // 初始化粒子位置和尺寸
        for (let i = 0; i < particleCount; i++) {
            // 在彗星背后的圆锥体内分布粒子
            const distance = Math.random() * 80; // 粒子从彗星向后延伸的距离
            const angle = Math.random() * Math.PI * 2; // 随机角度
            const radius = Math.random() * 10 * (distance / 80); // 随距离增大的半径
            
            // 计算粒子位置
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = -distance; // 粒子在彗星后方
            
            // 设置粒子位置
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // 设置粒子尺寸（越远越小）
            sizes[i] = Math.random() * 2 * (1 - distance / 80);
        }
        
        // 设置粒子位置和尺寸属性
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // 粒子材质
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 1.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // 创建粒子系统
        this.particles = new THREE.Points(particles, particleMaterial);
        this.group.add(this.particles);
    }
    
    createOrbit() {
        // 创建椭圆轨道点
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const x = this.a * Math.cos(angle);
            const z = this.b * Math.sin(angle);
            points.push(new THREE.Vector3(x, 0, z));
        }
        
        // 创建轨道线
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xFF0000,
            linewidth: 2
        });
        this.orbit = new THREE.Line(geometry, material);
        this.scene.add(this.orbit);
        
        console.log('轨道创建完成');
    }
    
    updatePosition(time) {
        // 计算当前时刻（0-1）
        const t = ((Date.now() - this.startTime) / 1000) % this.period / this.period;
        const angle = t * Math.PI * 2;
        
        // 计算彗星在椭圆上的位置
        const x = this.a * Math.cos(angle);
        const z = this.b * Math.sin(angle);
        
        // 更新彗星位置
        this.group.position.x = x;
        this.group.position.z = z;
        
        // 更新调试标记
        this.debugMarker.position.set(x, 0, z);
        
        // 计算彗星朝向（尾巴朝向太阳的反方向）
        const directionToSun = new THREE.Vector3(-x, 0, -z).normalize();
        const angle2 = Math.atan2(directionToSun.z, directionToSun.x);
        this.group.rotation.y = angle2 + Math.PI / 2;
        
        // 每20帧输出一次位置信息
        if (Math.random() < 0.05) {
            console.log(`彗星位置: x=${x.toFixed(2)}, z=${z.toFixed(2)}, angle=${angle.toFixed(2)}`);
        }
    }
}

// 创建彗星实例
let comet;

// 保存太阳光晕和太阳核心引用
let sunGlow, sunCore;

/**
 * 初始化太阳系场景
 */
function init() {
    console.log('初始化太阳系模型...');
    
    // 清理可能存在的旧元素
    cleanupExistingElements();
    
    // 清除已显示的star.png错误信息
    const errorMessage = document.getElementById('error-message');
    if (errorMessage && errorMessage.innerHTML.includes('star.png')) {
        errorMessage.style.display = 'none';
    }
    
    // 创建加载信息
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.innerHTML = '正在加载太阳系...';
        loadingMessage.style.display = 'block';
    }
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000010);
    
    // 创建相机 - 调整相机位置和视角以看到整个太阳系
    camera = new THREE.PerspectiveCamera(
        45,                                    // 视野角度改为45度，提供更广阔视野
        window.innerWidth / window.innerHeight, // 宽高比
        0.1,                                   // 近裁剪面
        2000                                   // 远裁剪面增加到2000
    );
    camera.position.set(0, 80, 120);           // 相机位置调整，更高更远以看到整个星系
    camera.lookAt(scene.position);             // 相机朝向场景中心
    console.log('相机创建完成');
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011, 1);       // 设置背景颜色为深蓝黑色，与纯黑区分
    renderer.setPixelRatio(window.devicePixelRatio); // 设置像素比以提高清晰度
    // 启用物理正确的光照模型
    renderer.physicallyCorrectLights = true;
    // 启用阴影图
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔和阴影
    document.body.appendChild(renderer.domElement);
    
    // 添加环境光 - 显著增强环境光亮度
    const ambientLight = new THREE.AmbientLight(0x606080, 5.0); // 增加蓝色调和强度
    scene.add(ambientLight);
    
    // 添加点光源（太阳光）- 增强太阳光亮度
    const pointLight = new THREE.PointLight(0xFFFFAA, 10, 500); // 增大强度并添加黄色调，增加照射距离
    pointLight.position.set(0, 0, 0);          // 光源位于太阳中心
    pointLight.castShadow = true;              // 启用阴影投射
    // 配置阴影质量
    pointLight.shadow.mapSize.width = 2048;   // 增加阴影贴图分辨率
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 500; // 增加阴影范围
    scene.add(pointLight);
    
    // 添加强一点的日光（平行光）
    const directionalLight = new THREE.DirectionalLight(0xffffdd, 3.0); // 增强平行光
    directionalLight.position.set(5, 3, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 添加额外的环境光，确保行星背面也可见
    const backLight = new THREE.HemisphereLight(0x606080, 0x404040, 3.0);
    scene.add(backLight);
    
    // 创建太阳
    console.log('创建太阳...');
    const sunGeometry = new THREE.SphereGeometry(3, 64, 64); // 增加太阳几何体细节
    
    // 加载NASA的太阳纹理 - 修复路径问题
    const sunTexture = textureLoader.load('/assets/textures/nasa/sun.jpg');
    sunTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 提高纹理质量
    console.log('太阳纹理加载完成');
    
    // 创建自发光材质，使太阳看起来更真实
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: sunTexture,
        color: 0xffffff, // 使用白色，让纹理本身的颜色显示
        emissive: 0xffa500, // 使用橙色自发光
        emissiveIntensity: 0.5 // 降低自发光强度
    });
    
    // 创建太阳
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.castShadow = false; // 太阳不需要投射阴影
    sun.receiveShadow = false; // 太阳不接收阴影
    scene.add(sun);
    
    // 添加太阳光晕效果 - 增强光晕效果
    const sunGlowGeometry = new THREE.SphereGeometry(4.2, 64, 64); // 增大光晕半径
    const sunGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            viewVector: { value: camera.position },
            sunColor: { value: new THREE.Color(0xffa07a) } // 修改太阳光晕颜色为淡珊瑚色
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * viewVector);
                intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 sunColor;
            varying float intensity;
            void main() {
                vec3 glow = sunColor * intensity;
                gl_FragColor = vec4(glow, 1.0);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    
    sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    scene.add(sunGlow);
    
    // 添加太阳中心明亮点和光线效果
    const sunCoreGeometry = new THREE.SphereGeometry(2.8, 64, 64);
    const sunCoreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8, // 增加核心不透明度
        blending: THREE.AdditiveBlending
    });
    sunCore = new THREE.Mesh(sunCoreGeometry, sunCoreMaterial);
    scene.add(sunCore);
    
    // 添加太阳光晕效果 (使用圆形几何体，不再使用八边形)
    const sunRaysGeometry = new THREE.CircleGeometry(15, 64); // 增加分段数，使其更圆滑
    const sunRaysMaterial = new THREE.MeshBasicMaterial({
        color: 0xffa07a,
        transparent: true,
        opacity: 0.3, // 降低不透明度，使效果更柔和
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const sunRays = new THREE.Mesh(sunRaysGeometry, sunRaysMaterial);
    sunRays.rotation.x = Math.PI / 2;
    scene.add(sunRays);
    
    console.log('太阳创建完成');
    
    // 创建行星
    createPlanets();
    
    // 创建星空背景
    createStarfield();
    
    // 创建彗星
    comet = new Comet(scene);
    scene.add(comet.group);
    
    // 添加轨道控制器，使场景可以被鼠标控制
    console.log('正在初始化轨道控制器...');
    controls = new OrbitControls(camera, renderer.domElement);
    
    // 配置控制器
    controls.enableDamping = true; // 启用阻尼效果，使摄像机平滑移动
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // 禁用屏幕空间平移
    controls.minDistance = 10; // 设置最小缩放距离
    controls.maxDistance = 300; // 增加最大缩放距离以便看到整个系统
    controls.enableRotate = true; // 确保启用旋转
    controls.rotateSpeed = 0.8; // 调整旋转速度
    controls.zoomSpeed = 1.2; // 增加缩放速度
    controls.autoRotate = false; // 关闭自动旋转以便用户可以手动控制
    controls.autoRotateSpeed = 0.5; // 设置自动旋转速度
    
    // 确保控制器能被正确交互
    controls.enabled = true;
    controls.enableZoom = true; // 确保可以缩放
    controls.enablePan = true; // 确保可以平移
    
    // 绑定键盘事件
    controls.listenToKeyEvents(window);
    
    // 手动为控制器添加事件侦听器，确保事件正确绑定
    console.log('手动绑定控制器事件...');
    
    // 打印控制器状态
    console.log('轨道控制器配置:', {
        enabled: controls.enabled,
        enableRotate: controls.enableRotate,
        enableZoom: controls.enableZoom,
        enablePan: controls.enablePan,
        autoRotate: controls.autoRotate
    });
    
    console.log('轨道控制器初始化完成');
    
    // 添加交互提示
    addInteractionHint();
    
    // 添加窗口大小变化的监听器
    window.addEventListener('resize', onWindowResize);
    
    // 添加行星名称标签
    addPlanetLabels();
    
    // 添加点击事件监听器
    addClickEventListener();
    
    // 创建UI控制面板
    createControlPanel();
    
    // 执行动画
    animate();
    
    console.log('太阳系场景初始化完成');
}

/**
 * 清理可能存在的旧元素
 */
function cleanupExistingElements() {
    // 检查是否有旧的UI元素，如果有则移除
    const oldControls = document.querySelectorAll('.control-panel');
    if (oldControls.length > 0) {
        oldControls.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 检查是否有旧的行星标签
    const oldLabels = document.querySelectorAll('.planet-label');
    if (oldLabels.length > 0) {
        oldLabels.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 检查是否有旧的行星信息弹窗
    const oldModals = document.querySelectorAll('.planet-modal, .modal-overlay');
    if (oldModals.length > 0) {
        oldModals.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 检查是否有旧的交互提示
    const oldHints = document.querySelectorAll('.interaction-hint');
    if (oldHints.length > 0) {
        oldHints.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    // 重置全局变量
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    sun = null;
    planets = {};
    
    console.log('已清理太阳系模型旧元素');
}

/**
 * 添加交互提示
 */
function addInteractionHint() {
    // 创建交互提示容器
    const hintContainer = document.createElement('div');
    hintContainer.style.position = 'fixed';
    hintContainer.style.bottom = '20px';
    hintContainer.style.left = '20px';
    hintContainer.style.color = '#00ffff';
    hintContainer.style.background = 'rgba(0, 0, 40, 0.5)';
    hintContainer.style.padding = '10px';
    hintContainer.style.borderRadius = '5px';
    hintContainer.style.fontFamily = 'Arial, sans-serif';
    hintContainer.style.fontSize = '14px';
    hintContainer.style.zIndex = '1000';
    hintContainer.style.pointerEvents = 'none'; // 鼠标可穿透
    hintContainer.style.transition = 'opacity 1s';
    hintContainer.style.opacity = '1';
    
    hintContainer.textContent = '左键拖动：旋转视角 | 滚轮：缩放 | 右键拖动：平移';
    
    // 5秒后淡出提示
    setTimeout(() => {
        hintContainer.style.opacity = '0';
        // 完全淡出后移除元素
        setTimeout(() => {
            if (hintContainer.parentNode) {
                hintContainer.parentNode.removeChild(hintContainer);
            }
        }, 1000);
    }, 5000);
    
    document.body.appendChild(hintContainer);
}

// 创建行星
function createPlanets() {
    console.log('开始创建行星系统...');
    
    for (let planetName in planetData) {
        const data = planetData[planetName];
        const satellites = [];
        
        console.log(`创建行星: ${planetName}, 距离: ${data.distance}`);
        
        // 创建行星几何体和材质 - 增加细节
        const geometry = new THREE.SphereGeometry(data.radius, 64, 64);  // 调整几何体细节
        let material;
        
        try {
            console.log(`尝试加载纹理: ${data.textureUrl}`);
            const texture = textureLoader.load(data.textureUrl);
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();  // 提高纹理质量
            
            // 使用更亮的材质，确保在黑暗背景中可见
            material = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: 0.7,                    // 降低粗糙度，增加光泽
                metalness: 0.1,                    // 增加一点金属感
                emissive: new THREE.Color(0x333333), // 添加自发光效果
                emissiveIntensity: 0.3              // 增加自发光强度
            });
            
            // 添加调试日志
            console.log(`${planetName}的纹理加载成功`);
        } catch (error) {
            console.warn(`无法加载${planetName}的纹理，使用基础颜色`, error);
            // 使用更亮的基础颜色
            material = new THREE.MeshStandardMaterial({ 
                color: data.color,
                roughness: 0.7,                    // 降低粗糙度，增加光泽
                metalness: 0.1,                    // 增加一点金属感
                emissive: new THREE.Color(data.color).multiplyScalar(0.3), // 添加自发光
            });
        }
        
        // 创建行星网格
        const planet = new THREE.Mesh(geometry, material);
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        // 设置行星的初始位置
        const angle = Math.random() * Math.PI * 2; // 随机角度
        const x = Math.cos(angle) * data.distance;
        const z = Math.sin(angle) * data.distance;
        planet.position.set(x, 0, z);
        
        // 创建行星周围的光晕效果，增强可见性
        const glowGeometry = new THREE.SphereGeometry(data.radius * 1.2, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        planet.add(glow);
        
        // 创建行星轨道 - 使轨道更清晰可见
        const orbitGeometry = new THREE.RingGeometry(data.distance - 0.05, data.distance + 0.05, 180);  // 增加轨道细节
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff, // 更亮的蓝色轨道
            side: THREE.DoubleSide,
            opacity: 0.6,  // 增加轨道不透明度
            transparent: true
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        
        // 添加到场景
        scene.add(orbit);
        scene.add(planet);
        
        // 处理土星环
        if (planetName === 'saturn') {
            try {
                console.log('创建土星环...');
                
                // 创建土星环几何体
                const ringGeometry = new THREE.RingGeometry(
                    data.radius * 1.2, // 内径
                    data.radius * 2.5, // 外径增大
                    128 // 分段数增加
                );
                
                // 加载土星环纹理 - 修复路径问题
                const ringTexture = textureLoader.load(data.ringUrl || '/assets/textures/nasa/saturn-rings.png');
                ringTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                
                const ringMaterial = new THREE.MeshStandardMaterial({
                    map: ringTexture,
                    transparent: true,
                    opacity: 0.9, // 增加不透明度
                    side: THREE.DoubleSide,
                    emissive: new THREE.Color(0x444433), // 添加自发光效果
                    emissiveIntensity: 0.3               // 自发光强度
                });
                
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2; // 旋转环使其水平
                planet.add(ring); // 添加到行星作为子对象
                
                console.log('土星环创建完成');
            } catch (error) {
                console.error('创建土星环失败:', error);
            }
        }
        
        // 处理卫星，为卫星也添加发光效果
        if (data.satellites && data.satellites.length > 0) {
            console.log(`创建${planetName}的卫星...`);
            
            for (const satData of data.satellites) {
                const satGeometry = new THREE.SphereGeometry(satData.radius, 32, 32);
                let satMaterial;
                
                try {
                    const satTexture = textureLoader.load(satData.textureUrl);
                    satMaterial = new THREE.MeshStandardMaterial({
                        map: satTexture,
                        roughness: 0.7,
                        metalness: 0.1,
                        emissive: new THREE.Color(0x222222), // 添加自发光
                        emissiveIntensity: 0.3               // 自发光强度
                    });
                } catch (error) {
                    console.warn(`无法加载${satData.name}的纹理，使用基础颜色`);
                    satMaterial = new THREE.MeshStandardMaterial({
                        color: satData.color,
                        roughness: 0.7,
                        metalness: 0.1,
                        emissive: new THREE.Color(satData.color).multiplyScalar(0.3) // 添加自发光
                    });
                }
                
                const satellite = new THREE.Mesh(satGeometry, satMaterial);
                satellite.castShadow = true;
                satellite.receiveShadow = true;
                
                // 设置卫星的初始位置
                const satAngle = Math.random() * Math.PI * 2;
                const satX = Math.cos(satAngle) * satData.distance;
                const satZ = Math.sin(satAngle) * satData.distance;
                satellite.position.set(satX, 0, satZ);
                
                // 创建卫星轨道
                const satOrbitGeometry = new THREE.RingGeometry(satData.distance - 0.02, satData.distance + 0.02, 64);
                const satOrbitMaterial = new THREE.MeshBasicMaterial({
                    color: 0xaaaaaa, // 使用更亮的颜色
                    side: THREE.DoubleSide,
                    opacity: 0.7,    // 增加不透明度
                    transparent: true
                });
                const satOrbit = new THREE.Mesh(satOrbitGeometry, satOrbitMaterial);
                satOrbit.rotation.x = Math.PI / 2;
                
                planet.add(satOrbit);
                planet.add(satellite);
                
                satellites.push({
                    mesh: satellite,
                    angle: satAngle,
                    data: satData
                });
            }
        }
        
        // 存储行星数据
        planets[planetName] = {
            mesh: planet,
            angle: angle,
            data: data,
            satellites: satellites
        };
    }
    
    console.log('行星系统创建完成，总计:', Object.keys(planets).length, '个行星');
}

/**
 * 创建星空背景
 */
function createStarfield() {
    console.log('创建星空背景...');
    
    // 加载NASA的星空纹理 - 修复路径问题
    const starTexture = textureLoader.load('/assets/textures/planets/stars.jpg');
    
    // 增强纹理效果
    starTexture.wrapS = THREE.RepeatWrapping;
    starTexture.wrapT = THREE.RepeatWrapping;
    starTexture.repeat.set(2, 2); // 重复纹理，增加星星密度
    starTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 提高纹理质量
    
    // 使用球形几何体创建星空
    const starGeometry = new THREE.SphereGeometry(400, 64, 64); // 增大背景球体尺寸
    
    // 将纹理应用于材质的内部，并增强发光效果
    const starMaterial = new THREE.MeshBasicMaterial({
        map: starTexture,
        side: THREE.BackSide,
        color: 0x8888ff, // 使用淡蓝色，让星空更加明显
        transparent: true,
        opacity: 1.0 // 设置为完全不透明
    });
    
    // 创建星空网格并添加到场景
    const starfield = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(starfield);
    
    // 添加背景点状星星，增加星空效果的层次感
    const starsGeometry = new THREE.BufferGeometry();
    
    // 加载星星纹理，使用圆形纹理替代默认方形点
    const starTextureSprite = textureLoader.load('/assets/textures/planets/star.png');
    
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.2, // 增大星星尺寸
        transparent: true,
        opacity: 1.0, // 完全不透明
        sizeAttenuation: true,
        map: starTextureSprite, // 使用星星纹理
        alphaTest: 0.5 // 添加alphaTest属性去除黑色背景
    });
    
    const starsVertices = [];
    for (let i = 0; i < 8000; i++) { // 减少星星数量
        const x = (Math.random() - 0.5) * 500;
        const y = (Math.random() - 0.5) * 500;
        const z = (Math.random() - 0.5) * 500;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starPoints = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starPoints);
    
    // 添加发光星云效果
    const nebulaMaterial = new THREE.PointsMaterial({
        color: 0x5599ff, // 更亮的蓝色
        size: 5,    // 增大尺寸
        transparent: true,
        opacity: 0.6, // 增加星云不透明度
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        map: starTextureSprite, // 使用相同的星星纹理
        alphaTest: 0.2 // 添加alphaTest属性去除黑色背景
    });
    
    const nebulaVertices = [];
    for (let i = 0; i < 300; i++) { // 减少星云粒子数量
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        nebulaVertices.push(x, y, z);
    }
    
    const nebulaGeometry = new THREE.BufferGeometry();
    nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaVertices, 3));
    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);
    
    console.log('星空背景创建完成');
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 更新行星位置
function updatePlanets() {
    for (let planetName in planets) {
        const planet = planets[planetName];
        const data = planet.data;
        
        // 更新行星角度
        planet.angle += data.speed;
        
        // 计算新的位置
        const x = Math.cos(planet.angle) * data.distance;
        const z = Math.sin(planet.angle) * data.distance;
        
        // 更新行星位置
        planet.mesh.position.set(x, 0, z);
        
        // 让行星自转
        planet.mesh.rotation.y += data.speed * 0.5;
        
        // 更新卫星位置
        for (const satellite of planet.satellites) {
            satellite.angle += satellite.data.speed;
            
            const satX = Math.cos(satellite.angle) * satellite.data.distance;
            const satZ = Math.sin(satellite.angle) * satellite.data.distance;
            
            satellite.mesh.position.set(satX, 0, satZ);
            satellite.mesh.rotation.y += satellite.data.speed * 0.5;
        }
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新行星位置
    updatePlanets();
    
    // 让太阳自转
    sun.rotation.y += 0.002;
    
    // 更新太阳光晕效果，使其始终面向摄像机
    if (sunGlow && sunGlow.material.uniforms) {
        sunGlow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
            camera.position, 
            sunGlow.position
        );
    }
    
    // 更新太阳核心位置
    if (sunCore) {
        // 让太阳核心有轻微的波动，增加活力感
        const time = Date.now() * 0.001;
        const scale = 1.0 + Math.sin(time) * 0.03;
        sunCore.scale.set(scale, scale, scale);
    }
    
    // 优先更新控制器，确保每帧都响应用户输入
    if (controls) {
        // 确保控制器始终启用
        controls.enabled = true;
        
        // 确保控制器状态与全局设置一致
        if (window.isAutoRotateEnabled !== undefined) {
            controls.autoRotate = window.isAutoRotateEnabled;
        }
        
        // 应用控制器更新
        controls.update();
        
        // 添加调试信息
        if (Math.random() < 0.001) {  // 降低日志频率
            console.log('控制器状态:', {
                enabled: controls.enabled,
                autoRotate: controls.autoRotate, 
                相机位置: camera.position,
                可视距离: controls.maxDistance
            });
        }
    }
    
    // 更新彗星
    if (comet) {
        comet.updatePosition(Date.now());
    }
    
    // 更新行星标签位置
    updatePlanetLabels();
    
    // 渲染场景
    renderer.render(scene, camera);
    
    // 初始化完成后显示一次性提示
    if (!window.initMessageShown) {
        window.initMessageShown = true;
        
        // 等待一会儿再显示，确保场景已加载
        setTimeout(() => {
            console.log('%c太阳系场景初始化完成！', 'color: lime; font-size: 16px; font-weight: bold;');
            console.log('%c你现在可以：', 'color: orange;');
            console.log('%c1. 使用鼠标左键拖动旋转视角', 'color: #aaffff;');
            console.log('%c2. 使用鼠标右键拖动平移视角', 'color: #aaffff;');
            console.log('%c3. 使用鼠标滚轮放大缩小', 'color: #aaffff;');
            console.log('%c4. 点击行星查看详细信息', 'color: #aaffff;');
            
            // 创建屏幕提示
            const tip = document.createElement('div');
            tip.style.position = 'fixed';
            tip.style.left = '50%';
            tip.style.bottom = '30px';
            tip.style.transform = 'translateX(-50%)';
            tip.style.backgroundColor = 'rgba(0,50,100,0.7)';
            tip.style.color = '#00ffff';
            tip.style.padding = '10px 20px';
            tip.style.borderRadius = '20px';
            tip.style.fontFamily = 'Arial, sans-serif';
            tip.style.zIndex = '1000';
            tip.style.boxShadow = '0 0 10px rgba(0,150,255,0.5)';
            tip.style.backdropFilter = 'blur(5px)';
            tip.style.transition = 'opacity 1s';
            tip.innerHTML = '拖动鼠标旋转视角 | 滚轮缩放 | 点击行星查看信息';
            
            document.body.appendChild(tip);
            
            // 5秒后淡出提示
            setTimeout(() => {
                tip.style.opacity = '0';
                setTimeout(() => tip.remove(), 1000);
            }, 5000);
        }, 1000);
    }
}

// 更新行星标签位置
function updatePlanetLabels() {
    // 遍历所有行星更新其标签位置
    for (let planetName in planets) {
        const planet = planets[planetName];
        // 只更新显示状态为block的标签
        if (planet.label && planet.label.style.display === 'block') {
            // 计算标签在屏幕上的位置
            const vector = new THREE.Vector3();
            vector.setFromMatrixPosition(planet.mesh.matrixWorld);
            
            // 检查行星是否在相机前方
            const isBehindCamera = vector.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) < 0;
            
            // 投影到屏幕坐标
            vector.project(camera);
            
            // 检查是否在视野范围内
            const isVisible = vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1 && vector.z < 1;
            
            // 转换为屏幕坐标
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // 根据行星大小和距离调整标签位置
            const offsetY = 25 + planet.data.radius * 5 / camera.position.distanceTo(planet.mesh.position);
            
            // 更新标签位置和可见性
            if (isVisible && !isBehindCamera) {
                planet.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - offsetY}px)`;
                planet.label.style.opacity = '1';
            } else {
                planet.label.style.opacity = '0';
            }
        }
    }
    
    // 更新太阳标签位置
    if (sun && sun.label && sun.label.style.display === 'block') {
        const sunVector = new THREE.Vector3();
        sunVector.setFromMatrixPosition(sun.matrixWorld);
        
        // 检查太阳是否在相机前方
        const isSunBehindCamera = sunVector.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) < 0;
        
        sunVector.project(camera);
        
        // 检查是否在视野范围内
        const isSunVisible = sunVector.x >= -1 && sunVector.x <= 1 && sunVector.y >= -1 && sunVector.y <= 1 && sunVector.z < 1;
        
        const sunX = (sunVector.x * 0.5 + 0.5) * window.innerWidth;
        const sunY = (-sunVector.y * 0.5 + 0.5) * window.innerHeight;
        
        // 太阳标签位置偏移
        const sunOffsetY = 35; // 太阳标签需要更大的偏移
        
        // 更新太阳标签位置和可见性
        if (isSunVisible && !isSunBehindCamera) {
            sun.label.style.transform = `translate(-50%, -100%) translate(${sunX}px, ${sunY - sunOffsetY}px)`;
            sun.label.style.opacity = '1';
        } else {
            sun.label.style.opacity = '0';
        }
    }
    
    // 添加调试信息
    if (Math.random() < 0.01) {  // 每100帧记录一次，避免日志过多
        console.log("标签更新中 - 可见性状态:", window.isPlanetLabelsVisible);
        
        // 输出地球标签的状态（如果存在）
        if (planets.earth && planets.earth.label) {
            console.log("地球标签状态:", {
                display: planets.earth.label.style.display,
                opacity: planets.earth.label.style.opacity,
                transform: planets.earth.label.style.transform
            });
        }
    }
}

/**
 * 添加行星名称标签
 * 在场景中为每个行星添加3D文本标签
 */
function addPlanetLabels() {
    console.log('添加行星名称标签...');
    
    // 创建一个组来存放所有标签
    const labelsGroup = new THREE.Group();
    labelsGroup.name = 'planetLabels';
    scene.add(labelsGroup);
    
    // 为每个行星添加标签
    for (let planetName in planets) {
        const planet = planets[planetName];
        
        // 创建行星名称的3D精灵
        const planetLabel = document.createElement('div');
        planetLabel.className = 'planet-label';
        planetLabel.textContent = planetName.charAt(0).toUpperCase() + planetName.slice(1);
        planetLabel.style.display = 'none'; // 初始隐藏
        
        // 将标签添加到DOM
        document.body.appendChild(planetLabel);
        
        // 存储DOM元素引用
        planet.label = planetLabel;
    }
    
    console.log('行星名称标签添加完成');
}

/**
 * 添加点击事件监听器
 * 处理行星的点击事件，显示行星信息弹窗
 */
function addClickEventListener() {
    console.log('添加点击事件监听器...');
    
    // 创建射线投射器用于检测鼠标点击的对象
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 收集所有可交互对象到一个数组中，便于射线检测
    const interactiveObjects = [];
    
    // 将所有行星添加到可交互对象数组中
    for (let planetName in planets) {
        interactiveObjects.push(planets[planetName].mesh);
        console.log(`添加行星到交互对象: ${planetName}`);
    }
    
    // 太阳也可以点击
    interactiveObjects.push(sun);
    console.log("太阳也添加到交互对象");
    
    // 使用pointerdown而不是click，与OrbitControls使用相同类型的事件
    renderer.domElement.addEventListener('pointerdown', function(event) {
        // 如果是右键或中键，不处理点击事件，让OrbitControls处理
        if (event.button !== 0) return;
        
        // 检查是否按下了控制键（这种情况下也应该由OrbitControls处理）
        if (event.ctrlKey || event.metaKey || event.shiftKey) return;
        
        // 保存原始事件对象的引用
        const originalEvent = event;
        
        // 计算鼠标位置归一化坐标
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 设置射线投射器从相机发出经过鼠标位置
        raycaster.setFromCamera(mouse, camera);
        
        // 只检测可交互对象（行星和太阳）
        const intersects = raycaster.intersectObjects(interactiveObjects, true);
        
        console.log(`检测到 ${intersects.length} 个交叉对象`);
        
        // 检查是否有交点
        if (intersects.length > 0) {
            const object = intersects[0].object;
            console.log(`点击了对象:`, object);
            
            // 特殊处理太阳点击
            if (object === sun) {
                console.log("点击了太阳");
                showPlanetInfo("sun", {
                    data: {
                        info: "太阳是太阳系的中心天体，一颗G型主序星，直径约1,392,700千米，质量是地球的333,000倍。"
                    }
                });
                // 防止事件传播到OrbitControls
                originalEvent.stopPropagation();
                return;
            }
            
            // 检查是否点击了行星或其子对象
            for (let planetName in planets) {
                const planet = planets[planetName];
                
                // 检查对象是否是行星本身或其子对象
                if (object === planet.mesh || object.parent === planet.mesh) {
                    console.log(`点击了行星: ${planetName}`);
                    
                    // 显示行星信息
                    showPlanetInfo(planetName, planet);
                    // 防止事件传播到OrbitControls
                    originalEvent.stopPropagation();
                    return;
                }
            }
        }
    });
    
    // 添加鼠标悬停效果，增强交互体验
    let currentHover = null;
    
    renderer.domElement.addEventListener('pointermove', function(event) {
        // 计算鼠标位置归一化坐标
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 设置射线投射器
        raycaster.setFromCamera(mouse, camera);
        
        // 只检测可交互对象
        const intersects = raycaster.intersectObjects(interactiveObjects, true);
        
        // 恢复之前悬停对象的样式
        if (currentHover) {
            if (currentHover === sun) {
                document.body.style.cursor = 'default';
            } else {
                // 获取行星对象的发光效果，恢复初始状态
                const childGlow = currentHover.children.find(child => 
                    child.material && child.material.opacity === 0.1);
                if (childGlow) {
                    childGlow.material.opacity = 0.1; // 恢复初始不透明度
                }
                document.body.style.cursor = 'default';
            }
            currentHover = null;
        }
        
        // 如果检测到交点，高亮当前悬停对象
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // 设置鼠标样式为指针，表示可点击
            document.body.style.cursor = 'pointer';
            
            // 特殊处理太阳悬停
            if (object === sun) {
                currentHover = sun;
                return;
            }
            
            // 查找是哪个行星
            for (let planetName in planets) {
                const planet = planets[planetName];
                if (object === planet.mesh || object.parent === planet.mesh) {
                    // 获取行星对象的发光效果，增强发光
                    const childGlow = planet.mesh.children.find(child => 
                        child.material && child.material.opacity === 0.1);
                    if (childGlow) {
                        childGlow.material.opacity = 0.3; // 增强发光效果
                    }
                    currentHover = planet.mesh;
                    break;
                }
            }
        }
    });
    
    console.log('点击事件监听器添加完成');
}

/**
 * 显示行星信息弹窗
 * @param {string} planetName - 行星名称
 * @param {object} planet - 行星对象
 */
function showPlanetInfo(planetName, planet) {
    // 获取或创建弹窗元素
    let modal = document.getElementById('planetModal');
    
    // 如果模态框不存在，创建它
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'planetModal';
        modal.style.position = 'fixed';
        modal.style.top = '20px';  // 放在顶部而不是中间，避免覆盖整个屏幕
        modal.style.right = '20px'; // 放在右侧而不是居中
        modal.style.transform = 'none'; // 移除居中变换
        modal.style.backgroundColor = 'rgba(10, 20, 40, 0.9)';
        modal.style.color = '#fff';
        modal.style.padding = '20px';
        modal.style.borderRadius = '10px';
        modal.style.zIndex = '1001';
        modal.style.maxWidth = '350px'; // 减小宽度
        modal.style.width = 'auto';
        modal.style.boxShadow = '0 0 20px rgba(0, 150, 255, 0.5)';
        modal.style.backdropFilter = 'blur(10px)';
        modal.style.border = '1px solid rgba(50, 100, 255, 0.3)';
        modal.style.display = 'none';
        
        // 创建标题元素
        const nameElement = document.createElement('h2');
        nameElement.id = 'planetName';
        nameElement.style.color = '#00ccff';
        nameElement.style.margin = '0 0 15px 0';
        nameElement.style.textAlign = 'center';
        nameElement.style.borderBottom = '1px solid rgba(0, 180, 255, 0.5)';
        nameElement.style.paddingBottom = '10px';
        
        // 创建内容元素
        const infoElement = document.createElement('div');
        infoElement.id = 'planetInfo';
        infoElement.style.marginBottom = '20px';
        infoElement.style.maxHeight = '300px'; // 限制高度
        infoElement.style.overflowY = 'auto'; // 添加垂直滚动条
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '关闭';
        closeButton.style.backgroundColor = '#2277cc';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.padding = '8px 16px';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.marginTop = '10px';
        closeButton.style.display = 'block';
        closeButton.style.marginLeft = 'auto';
        closeButton.style.marginRight = 'auto';
        closeButton.style.transition = 'background-color 0.3s';
        
        closeButton.onmouseover = function() {
            this.style.backgroundColor = '#3388ee';
        };
        
        closeButton.onmouseout = function() {
            this.style.backgroundColor = '#2277cc';
        };
        
        closeButton.onclick = function(event) {
            modal.style.display = 'none';
            // 阻止事件传播
            event.stopPropagation();
        };
        
        // 组装模态框
        modal.appendChild(nameElement);
        modal.appendChild(infoElement);
        modal.appendChild(closeButton);
        
        // 添加模态框点击事件阻止冒泡
        modal.addEventListener('click', function(event) {
            event.stopPropagation();
        });
        
        // 只将模态框添加到文档，不使用遮罩
        document.body.appendChild(modal);
    }
    
    // 获取行星名称和信息元素
    const nameElement = document.getElementById('planetName');
    const infoElement = document.getElementById('planetInfo');
    
    // 设置行星名称 - 中文名称
    const planetNamesChinese = {
        mercury: '水星',
        venus: '金星',
        earth: '地球',
        mars: '火星',
        jupiter: '木星',
        saturn: '土星',
        uranus: '天王星',
        neptune: '海王星',
        sun: '太阳'
    };
    
    nameElement.textContent = planetNamesChinese[planetName] || planetName.charAt(0).toUpperCase() + planetName.slice(1);
    
    // 设置行星信息
    const data = planet.data;
    let info = `
        <div class="planet-info" style="background: rgba(0,30,60,0.5); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong style="color: #00ccff;">描述：</strong> <span style="color: #ffffff;">${data.info || '暂无信息'}</span></p>`;
    
    // 如果不是太阳，添加行星特有信息
    if (planetName !== 'sun') {
        info += `
            <p style="margin: 5px 0;"><strong style="color: #00ccff;">半径：</strong> <span style="color: #ffffff;">${data.radius} 地球半径</span></p>
            <p style="margin: 5px 0;"><strong style="color: #00ccff;">距离太阳：</strong> <span style="color: #ffffff;">${data.distance} 天文单位</span></p>
            <p style="margin: 5px 0;"><strong style="color: #00ccff;">公转速度：</strong> <span style="color: #ffffff;">${data.speed}</span></p>`;
    }
    
    info += `</div>`;
    
    // 如果有卫星，添加卫星信息
    if (planet.satellites && planet.satellites.length > 0) {
        info += '<div class="satellites-list" style="background: rgba(0,20,40,0.5); padding: 15px; border-radius: 8px;"><h3 style="color: #00ccff; margin-top: 0;">卫星</h3>';
        for (const satellite of planet.satellites) {
            const satName = satellite.data.name === 'moon' ? '月球' : satellite.data.name.charAt(0).toUpperCase() + satellite.data.name.slice(1);
            info += `
                <div class="satellite-item" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(0,100,200,0.3);">
                    <h4 style="color: #88ccff; margin: 5px 0;">${satName}</h4>
                    <p style="margin: 3px 0;"><strong>描述：</strong> ${satellite.data.info || '暂无信息'}</p>
                    <p style="margin: 3px 0;"><strong>半径：</strong> ${satellite.data.radius} 地球半径</p>
                    <p style="margin: 3px 0;"><strong>距离：</strong> ${satellite.data.distance} 行星半径</p>
                </div>
            `;
        }
        info += '</div>';
    }
    
    infoElement.innerHTML = info;
    
    // 显示弹窗
    modal.style.display = 'block';
}

/**
 * 添加行星名称切换功能
 * 添加UI控件以切换行星名称标签的显示/隐藏
 */
function addNameToggle() {
    console.log('添加行星名称切换功能...');
    
    // 创建名称显示切换控件
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'toggle-container';
    toggleContainer.style.position = 'fixed';
    toggleContainer.style.bottom = '20px';
    toggleContainer.style.right = '20px';
    toggleContainer.style.zIndex = '1000';
    toggleContainer.style.background = 'rgba(0, 0, 40, 0.3)';
    toggleContainer.style.padding = '10px';
    toggleContainer.style.borderRadius = '8px';
    toggleContainer.style.backdropFilter = 'blur(8px)';
    toggleContainer.style.border = '1px solid rgba(0, 150, 255, 0.3)';
    toggleContainer.style.color = '#ffffff';
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.gap = '10px';
    
    // 创建标签
    const label = document.createElement('label');
    label.textContent = '显示行星名称';
    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';
    
    // 创建复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'showNames';
    checkbox.style.cursor = 'pointer';
    
    // 添加事件监听
    checkbox.addEventListener('change', function() {
        togglePlanetLabels(this.checked);
    });
    
    // 将元素添加到容器
    toggleContainer.appendChild(label);
    toggleContainer.appendChild(checkbox);
    
    // 将容器添加到文档
    document.body.appendChild(toggleContainer);
    
    console.log('行星名称切换功能添加完成');
}

/**
 * 切换行星名称标签的显示/隐藏
 * @param {boolean} show - 是否显示标签
 */
function togglePlanetLabels(show) {
    console.log(`${show ? '显示' : '隐藏'}行星名称标签`);
    
    // 更新所有行星标签的显示状态
    for (let planetName in planets) {
        const planet = planets[planetName];
        if (planet.label) {
            planet.label.style.display = show ? 'block' : 'none';
            // 如果显示，先设置为可见但透明，然后淡入
            if (show) {
                planet.label.style.opacity = '0';
                setTimeout(() => {
                    planet.label.style.opacity = '1';
                }, 50);
            }
        }
    }
    
    // 更新太阳标签显示状态
    if (sun && sun.label) {
        sun.label.style.display = show ? 'block' : 'none';
        if (show) {
            sun.label.style.opacity = '0';
            setTimeout(() => {
                sun.label.style.opacity = '1';
            }, 50);
        }
    }

    // 在每一帧更新标签位置
    if (show) {
        // 添加更新函数到动画循环
        function updateLabelsPosition() {
            // 检查标签是否仍然显示
            const checkbox = document.getElementById('showNames');
            if (!checkbox || !checkbox.checked) {
                return; // 如果标签已关闭，停止更新
            }
            
            // 遍历所有行星
            for (let planetName in planets) {
                const planet = planets[planetName];
                if (planet.label && planet.label.style.display === 'block') {
                    // 计算标签在屏幕上的位置
                    const vector = new THREE.Vector3();
                    vector.setFromMatrixPosition(planet.mesh.matrixWorld);
                    
                    // 检查行星是否在相机前方
                    const isBehindCamera = vector.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) < 0;
                    
                    // 投影到屏幕坐标
                    vector.project(camera);
                    
                    // 检查是否在视野范围内
                    const isVisible = vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1 && vector.z < 1;
                    
                    // 转换为屏幕坐标
                    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
                    
                    // 根据行星大小和距离调整标签位置
                    const offsetY = 25 + planet.data.radius * 5 / camera.position.distanceTo(planet.mesh.position);
                    
                    // 更新标签位置和可见性
                    if (isVisible && !isBehindCamera) {
                        planet.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - offsetY}px)`;
                        planet.label.style.opacity = '1';
                    } else {
                        planet.label.style.opacity = '0';
                    }
                }
            }
            
            // 更新太阳标签位置
            if (sun && sun.label && sun.label.style.display === 'block') {
                const sunVector = new THREE.Vector3();
                sunVector.setFromMatrixPosition(sun.matrixWorld);
                
                // 检查太阳是否在相机前方
                const isSunBehindCamera = sunVector.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) < 0;
                
                sunVector.project(camera);
                
                // 检查是否在视野范围内
                const isSunVisible = sunVector.x >= -1 && sunVector.x <= 1 && sunVector.y >= -1 && sunVector.y <= 1 && sunVector.z < 1;
                
                const sunX = (sunVector.x * 0.5 + 0.5) * window.innerWidth;
                const sunY = (-sunVector.y * 0.5 + 0.5) * window.innerHeight;
                
                // 太阳标签位置偏移
                const sunOffsetY = 35; // 太阳标签需要更大的偏移
                
                // 更新太阳标签位置和可见性
                if (isSunVisible && !isSunBehindCamera) {
                    sun.label.style.transform = `translate(-50%, -100%) translate(${sunX}px, ${sunY - sunOffsetY}px)`;
                    sun.label.style.opacity = '1';
                } else {
                    sun.label.style.opacity = '0';
                }
            }
            
            // 请求下一帧继续更新
            requestAnimationFrame(updateLabelsPosition);
        }
        
        // 启动标签位置更新
        updateLabelsPosition();
    }
}

/**
 * 创建UI控制面板
 * 用于控制场景的各种参数
 */
function createControlPanel() {
    // 创建控制面板容器
    const panel = document.createElement('div');
    panel.id = 'controlPanel';
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.background = 'rgba(0, 20, 40, 0.8)'; // 增加不透明度
    panel.style.padding = '15px';
    panel.style.borderRadius = '10px';
    panel.style.color = '#fff';
    panel.style.zIndex = '1000';
    panel.style.width = '250px'; // 增加宽度
    panel.style.boxShadow = '0 0 15px rgba(0, 150, 255, 0.7)'; // 增强阴影
    panel.style.backdropFilter = 'blur(10px)'; // 增强模糊效果
    panel.style.border = '1px solid rgba(0, 140, 255, 0.6)'; // 增强边框
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.fontSize = '14px';
    panel.style.transition = 'all 0.3s ease';
    
    // 创建标题
    const title = document.createElement('h3');
    title.textContent = '太阳系控制面板';
    title.style.margin = '0 0 15px 0';
    title.style.textAlign = 'center';
    title.style.color = '#00ccff';
    title.style.borderBottom = '1px solid rgba(0, 150, 255, 0.5)';
    title.style.paddingBottom = '8px';
    title.style.fontSize = '18px'; // 增大字体
    
    // 添加控制选项
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.gap = '12px'; // 增加间距
    
    // 添加自动旋转控制
    const autoRotateControl = createControlElement('自动旋转', 'checkbox', function(checked) {
        if (controls) {
            controls.autoRotate = checked;
            // 存储设置到全局变量，确保其他地方也能访问此状态
            window.isAutoRotateEnabled = checked;
            console.log('自动旋转设置为:', checked);
        }
    }, { checked: true });  // 默认选中
    
    // 添加动画速度控制
    const speedControl = createControlElement('动画速度', 'range', function(value) {
        // 调整行星移动速度，value范围是0到1
        const speedFactor = parseFloat(value);
        for (let planetName in planets) {
            planets[planetName].data.speed = planets[planetName].data.originalSpeed * speedFactor;
        }
    }, { min: 0, max: 2, step: 0.1, default: 1 });
    
    // 添加亮度控制
    const brightnessControl = createControlElement('场景亮度', 'range', function(value) {
        // 调整环境光强度
        const brightness = parseFloat(value);
        if (scene) {
            scene.traverse(function(object) {
                if (object instanceof THREE.AmbientLight) {
                    object.intensity = brightness;
                }
            });
        }
    }, { min: 0.5, max: 3, step: 0.1, default: 2.0 });
    
    // 添加显示行星名称控制
    const showLabelsControl = createControlElement('显示行星名称', 'checkbox', function(checked) {
        togglePlanetLabels(checked);
    }, { checked: false });  // 默认未选中
    
    // 添加控制元素到面板
    controls.appendChild(autoRotateControl);
    controls.appendChild(speedControl);
    controls.appendChild(brightnessControl);
    controls.appendChild(showLabelsControl);
    
    // 添加按钮：重置视角
    const resetViewButton = document.createElement('button');
    resetViewButton.textContent = '重置相机视角';
    resetViewButton.style.marginTop = '15px';
    resetViewButton.style.padding = '8px 12px';
    resetViewButton.style.backgroundColor = '#0066cc';
    resetViewButton.style.color = 'white';
    resetViewButton.style.border = 'none';
    resetViewButton.style.borderRadius = '5px';
    resetViewButton.style.cursor = 'pointer';
    resetViewButton.style.width = '100%';
    resetViewButton.style.fontSize = '14px';
    
    resetViewButton.addEventListener('click', function() {
        // 重置相机位置和视角
        camera.position.set(0, 80, 120);
        camera.lookAt(scene.position);
        controls.target.set(0, 0, 0);
        controls.update();
    });
    
    controls.appendChild(resetViewButton);
    
    // 组装面板
    panel.appendChild(title);
    panel.appendChild(controls);
    
    // 添加到文档
    document.body.appendChild(panel);
    
    // 保存原始速度
    for (let planetName in planets) {
        planets[planetName].data.originalSpeed = planets[planetName].data.speed;
    }
}

/**
 * 创建单个控制元素
 * @param {string} label - 控制元素标签
 * @param {string} type - 控制元素类型 (checkbox 或 range)
 * @param {function} onChange - 值变化时的回调函数
 * @param {object} options - 配置选项 (对于range类型)
 * @returns {HTMLElement} 控制元素容器
 */
function createControlElement(label, type, onChange, options = {}) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.flex = '1';
    
    const inputElement = document.createElement('input');
    inputElement.type = type;
    
    if (type === 'checkbox') {
        inputElement.style.cursor = 'pointer';
        inputElement.style.width = '16px';
        inputElement.style.height = '16px';
        if (options.checked) {
            inputElement.checked = true;
        }
    } else if (type === 'range') {
        inputElement.min = options.min || 0;
        inputElement.max = options.max || 1;
        inputElement.step = options.step || 0.1;
        inputElement.value = options.default || 1;
        inputElement.style.width = '100px';
        inputElement.style.cursor = 'pointer';
    }
    
    inputElement.addEventListener('change', function() {
        const value = type === 'checkbox' ? this.checked : this.value;
        onChange(value);
    });
    
    inputElement.addEventListener('input', function() {
        const value = type === 'checkbox' ? this.checked : this.value;
        onChange(value);
    });
    
    container.appendChild(labelElement);
    container.appendChild(inputElement);
    
    return container;
}

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', init);

// 导出初始化函数
export { init };