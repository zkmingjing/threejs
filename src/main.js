import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
    createEarthMaterial,
    createMarsMaterial,
    createJupiterMaterial,
    createSaturnMaterial,
    createSaturnRing,
    updateClouds,
    updatePlanetRotation,
    updatePlanetOrbit,
    toggleAnimation,
    createMercuryMaterial,
    createVenusMaterial,
    createUranusMaterial,
    createNeptuneMaterial
} from './planets.js';

// 场景设置
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000); // 增加远平面距离
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 添加动画控制变量
let isAnimating = true;

// 添加环境光和平行光
const ambientLight = new THREE.AmbientLight(0x666666); // 增加环境光强度
scene.add(ambientLight);

// 添加一个平行光来补充照明
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// 创建轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 100, 200); // 调整相机位置
controls.minDistance = 50; // 设置最小缩放距离
controls.maxDistance = 500; // 设置最大缩放距离
controls.update();

// 创建行星对象
const planets = {
    satelliteGroups: {}, // 用于存储卫星组
    comet: null // 添加彗星属性
};

// 创建纹理加载管理器
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

// 加载进度处理
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    console.log(`正在加载: ${url} (${itemsLoaded}/${itemsTotal})`);
};

// 加载错误处理
loadingManager.onError = function(url) {
    console.error('加载错误:', url);
};

// 添加星空和彗星相关的变量
let starfield;
let stars = [];
let comets = [];
const STAR_COUNT = 5000; // 星星总数
const MAX_FLASHING_STARS = 50; // 最大闪烁星星数量
const COMET_COUNT = 1; // 只显示一个彗星

// 添加射线投射器用于检测点击
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 行星数据
const planetInfo = {
    sun: {
        name: '太阳',
        radius: '696,340 km',
        distance: '0 km (中心)',
        speed: '0 km/s',
        satellites: [],
        special: {
            type: '恒星',
            temperature: '5,500°C (表面)',
            age: '约46亿年',
            composition: '氢(73%)、氦(25%)、其他元素(2%)',
            probes: [
                { name: '帕克太阳探测器', year: '2018年至今' },
                { name: '太阳和日球层探测器(SOHO)', year: '1995年至今' },
                { name: '太阳动力学天文台(SDO)', year: '2010年至今' },
                { name: '日地关系天文台(STEREO)', year: '2006年至今' },
                { name: '太阳过渡区成像光谱仪(IRIS)', year: '2013年至今' }
            ]
        }
    },
    comet: {
        name: '系外彗星',
        radius: '约3.5 km',
        distance: '200-300 km (轨道范围)',
        speed: '1.0-3.0 km/s',
        satellites: [],
        special: {
            type: '彗星',
            composition: '冰、尘埃、岩石',
            orbit: '椭圆轨道',
            tail: '由太阳风和辐射压力形成',
            description: '系外彗星是指来自太阳系以外的彗星。这些彗星可能来自其他恒星系统，或者是在星际空间中形成的。系外彗星的发现对于理解宇宙中彗星的形成和演化具有重要意义。'
        }
    },
    mercury: {
        name: '水星',
        radius: '2,439.7 km',
        distance: '57.9 百万公里',
        speed: '47.87 km/s',
        satellites: [],
        special: {
            type: '类地行星',
            age: '约45亿年',
            composition: '铁(60%)、硅酸盐(40%)',
            habitability: '不适合生存',
            probes: [
                { name: '水手10号', year: '1974-1975年' },
                { name: '信使号', year: '2011-2015年' }
            ]
        }
    },
    venus: {
        name: '金星',
        radius: '6,051.8 km',
        distance: '108.2 百万公里',
        speed: '35.02 km/s',
        satellites: [],
        special: {
            type: '类地行星',
            age: '约45亿年',
            composition: '二氧化碳(96.5%)、氮气(3.5%)',
            habitability: '不适合生存',
            probes: [
                { name: '金星7号', year: '1970年' },
                { name: '金星9号', year: '1975年' },
                { name: '金星10号', year: '1975年' },
                { name: '金星13号', year: '1982年' },
                { name: '金星14号', year: '1982年' }
            ]
        }
    },
    earth: {
        name: '地球',
        radius: '6,371 km',
        distance: '149.6 百万公里',
        speed: '29.78 km/s',
        satellites: [
            {
                name: '月球',
                radius: '1,737.1 km',
                distance: '384,400 km',
                speed: '1.022 km/s'
            }
        ],
        special: {
            type: '类地行星',
            age: '约45亿年',
            composition: '氮气(78%)、氧气(21%)、其他气体(1%)',
            habitability: '适合生存',
            probes: [
                { name: '人造卫星', year: '1957年至今' },
                { name: '国际空间站', year: '1998年至今' }
            ]
        }
    },
    mars: {
        name: '火星',
        radius: '3,389.5 km',
        distance: '227.9 百万公里',
        speed: '24.077 km/s',
        satellites: [
            {
                name: '火卫一',
                radius: '11.267 km',
                distance: '9,377 km',
                speed: '2.138 km/s'
            },
            {
                name: '火卫二',
                radius: '6.2 km',
                distance: '23,460 km',
                speed: '1.351 km/s'
            }
        ],
        special: {
            type: '类地行星',
            age: '约45亿年',
            composition: '二氧化碳(95%)、氮气(2.7%)、氩气(1.6%)',
            habitability: '可能适合未来殖民',
            probes: [
                { name: '海盗1号', year: '1976年' },
                { name: '海盗2号', year: '1976年' },
                { name: '机遇号', year: '2004-2018年' },
                { name: '好奇号', year: '2012年至今' },
                { name: '毅力号', year: '2021年至今' }
            ]
        }
    },
    jupiter: {
        name: '木星',
        radius: '69,911 km',
        distance: '778.5 百万公里',
        speed: '13.07 km/s',
        satellites: [
            {
                name: '木卫一',
                radius: '1,821.6 km',
                distance: '421,700 km',
                speed: '17.334 km/s'
            },
            {
                name: '木卫二',
                radius: '1,560.8 km',
                distance: '670,900 km',
                speed: '13.740 km/s'
            },
            {
                name: '木卫三',
                radius: '2,634.1 km',
                distance: '1,070,400 km',
                speed: '10.880 km/s'
            },
            {
                name: '木卫四',
                radius: '2,410.3 km',
                distance: '1,882,700 km',
                speed: '8.204 km/s'
            }
        ],
        special: {
            type: '气态巨行星',
            age: '约45亿年',
            composition: '氢气(90%)、氦气(10%)、甲烷、氨气等',
            habitability: '不适合生存',
            probes: [
                { name: '先驱者10号', year: '1973年' },
                { name: '先驱者11号', year: '1974年' },
                { name: '旅行者1号', year: '1979年' },
                { name: '旅行者2号', year: '1979年' },
                { name: '伽利略号', year: '1995-2003年' },
                { name: '朱诺号', year: '2016年至今' }
            ]
        }
    },
    saturn: {
        name: '土星',
        radius: '58,232 km',
        distance: '1,433.5 百万公里',
        speed: '9.69 km/s',
        satellites: [
            {
                name: '土卫六',
                radius: '2,574.73 km',
                distance: '1,221,850 km',
                speed: '5.57 km/s'
            },
            {
                name: '土卫五',
                radius: '764.3 km',
                distance: '527,108 km',
                speed: '8.48 km/s'
            }
        ],
        special: {
            type: '气态巨行星',
            age: '约45亿年',
            composition: '氢气(96%)、氦气(3%)、甲烷、氨气等',
            habitability: '不适合生存',
            probes: [
                { name: '先驱者11号', year: '1979年' },
                { name: '旅行者1号', year: '1980年' },
                { name: '旅行者2号', year: '1981年' },
                { name: '卡西尼号', year: '2004-2017年' }
            ]
        }
    },
    uranus: {
        name: '天王星',
        radius: '25,362 km',
        distance: '2,872.5 百万公里',
        speed: '6.81 km/s',
        satellites: [],
        special: {
            type: '冰巨星',
            age: '约45亿年',
            composition: '氢气(83%)、氦气(15%)、甲烷(2%)',
            habitability: '不适合生存',
            probes: [
                { name: '旅行者2号', year: '1986年' }
            ]
        }
    },
    neptune: {
        name: '海王星',
        radius: '24,622 km',
        distance: '4,495.1 百万公里',
        speed: '5.43 km/s',
        satellites: [],
        special: {
            type: '冰巨星',
            age: '约45亿年',
            composition: '氢气(80%)、氦气(19%)、甲烷(1%)',
            habitability: '不适合生存',
            probes: [
                { name: '旅行者2号', year: '1989年' }
            ]
        }
    }
};

// 添加名称显示相关的变量
let nameLabels = {};
let showNames = false;

// 创建名称标签
function createNameLabel(planetName, planet) {
    const label = document.createElement('div');
    label.className = 'planet-name';
    label.textContent = planetInfo[planetName].name;
    label.setAttribute('data-planet', planetName); // 添加data-planet属性
    document.body.appendChild(label);
    nameLabels[planetName] = label;
}

// 更新名称标签位置
function updateNameLabels() {
    if (!showNames) return;

    for (const planetName in nameLabels) {
        let planet;
        if (planetName === 'comet') {
            planet = planets.comet;
        } else {
            planet = planets[planetName];
        }
        
        if (!planet) continue;

        const label = nameLabels[planetName];
        const vector = planet.position.clone();
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        // 检查是否在相机视野内
        if (vector.z < 1) {
            label.style.left = x + 'px';
            label.style.top = y + 'px';
            label.classList.add('visible');
        } else {
            label.classList.remove('visible');
        }
    }
}

// 创建太阳（作为中心点）
function createSun() {
    const radius = 8;  // 太阳尺寸
    const segments = 32;
    const sunGeometry = new THREE.SphereGeometry(radius, segments, segments);
    
    // 加载太阳纹理
    const sunTexture = textureLoader.load('./textures/planets/2k_sun.jpg');
    
    // 创建发光的太阳材质
    const sunMaterial = new THREE.MeshStandardMaterial({ 
        map: sunTexture,
        emissive: 0xffff00,
        emissiveIntensity: 2.0, // 增加发光强度
        emissiveMap: sunTexture,
        metalness: 0.0,
        roughness: 0.0
    });
    
    planets.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // 添加点光源模拟太阳发光
    const sunLight = new THREE.PointLight(0xffffff, 3, 1000); // 增加光照强度
    planets.sun.add(sunLight);
    
    // 添加发光效果
    const sunGlow = new THREE.PointLight(0xffff00, 2, 100); // 增加发光范围和强度
    planets.sun.add(sunGlow);
    
    scene.add(planets.sun);
    
    // 添加太阳自转动画
    updatePlanetRotation(planets.sun, 0.002);
}

// 创建地球
function createEarth() {
    const radius = 4;  // 增大地球尺寸
    const segments = 32;
    const earthGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const { earthMaterial, cloudsMaterial } = createEarthMaterial();

    planets.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(planets.earth);

    const cloudsGeometry = new THREE.SphereGeometry(radius * 1.01, segments, segments);
    planets.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    planets.earth.add(planets.clouds);

    // 创建地球的卫星
    if (satellites.earth) {
        planets.satelliteGroups.earth = satellites.earth.map(satData => 
            createSatellite(satData, planets.earth)
        );
    }
}

// 创建火星
function createMars() {
    const radius = 3;  // 火星尺寸
    const segments = 32;
    const marsGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const marsMaterial = createMarsMaterial();

    planets.mars = new THREE.Mesh(marsGeometry, marsMaterial);
    scene.add(planets.mars);

    // 创建火星的卫星
    if (satellites.mars) {
        planets.satelliteGroups.mars = satellites.mars.map(satData => 
            createSatellite(satData, planets.mars)
        );
    }
}

// 创建木星
function createJupiter() {
    const radius = 7;  // 木星尺寸
    const segments = 32;
    const jupiterGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const jupiterMaterial = createJupiterMaterial();

    planets.jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
    scene.add(planets.jupiter);

    // 创建木星的卫星
    if (satellites.jupiter) {
        planets.satelliteGroups.jupiter = satellites.jupiter.map(satData => 
            createSatellite(satData, planets.jupiter)
        );
    }
}

// 创建土星
function createSaturn() {
    const radius = 6;  // 土星尺寸
    const segments = 32;
    const saturnGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const { saturnMaterial, ringMaterial } = createSaturnMaterial();

    planets.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
    scene.add(planets.saturn);

    const ringGeometry = createSaturnRing(radius);
    planets.saturnRing = new THREE.Mesh(ringGeometry, ringMaterial);
    planets.saturnRing.rotation.x = Math.PI / 3;
    planets.saturn.add(planets.saturnRing);

    // 创建土星的卫星
    if (satellites.saturn) {
        planets.satelliteGroups.saturn = satellites.saturn.map(satData => 
            createSatellite(satData, planets.saturn)
        );
    }
}

// 创建水星
function createMercury() {
    const radius = 2.5;  // 增大水星尺寸
    const segments = 32;
    const mercuryGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const mercuryMaterial = createMercuryMaterial();

    planets.mercury = new THREE.Mesh(mercuryGeometry, mercuryMaterial);
    scene.add(planets.mercury);
}

// 创建金星
function createVenus() {
    const radius = 3.5;  // 增大金星尺寸
    const segments = 32;
    const venusGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const venusMaterial = createVenusMaterial();

    planets.venus = new THREE.Mesh(venusGeometry, venusMaterial);
    scene.add(planets.venus);
}

// 创建天王星
function createUranus() {
    const radius = 5;  // 天王星尺寸
    const segments = 32;
    const uranusGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const uranusMaterial = createUranusMaterial();

    planets.uranus = new THREE.Mesh(uranusGeometry, uranusMaterial);
    scene.add(planets.uranus);

    // 创建天王星的卫星
    if (satellites.uranus) {
        planets.satelliteGroups.uranus = satellites.uranus.map(satData => 
            createSatellite(satData, planets.uranus)
        );
    }
}

// 创建海王星
function createNeptune() {
    const radius = 5;  // 海王星尺寸
    const segments = 32;
    const neptuneGeometry = new THREE.SphereGeometry(radius, segments, segments);
    const neptuneMaterial = createNeptuneMaterial();

    planets.neptune = new THREE.Mesh(neptuneGeometry, neptuneMaterial);
    scene.add(planets.neptune);

    // 创建海王星的卫星
    if (satellites.neptune) {
        planets.satelliteGroups.neptune = satellites.neptune.map(satData => 
            createSatellite(satData, planets.neptune)
        );
    }
}

// 行星轨道参数
const orbits = {
    mercury: { radius: 20, speed: 0.008 },     // 水星（最快）
    venus: { radius: 35, speed: 0.006 },      // 金星
    earth: { radius: 50, speed: 0.005 },      // 地球
    mars: { radius: 65, speed: 0.004 },       // 火星
    jupiter: { radius: 85, speed: 0.003 },    // 木星
    saturn: { radius: 105, speed: 0.002 },     // 土星
    uranus: { radius: 125, speed: 0.0015 },    // 天王星
    neptune: { radius: 145, speed: 0.001 }     // 海王星（最慢）
};

// 定义卫星数据
const satellites = {
    earth: [
        { 
            name: 'moon', 
            radius: 1, 
            orbitRadius: 8, 
            speed: 0.015, 
            color: 0xCCCCCC,
            textureUrl: './textures/satellites/moon.jpg'  // NASA月球纹理
        }
    ],
    mars: [
        { 
            name: 'phobos', 
            radius: 0.3, 
            orbitRadius: 5, 
            speed: 0.02, 
            color: 0x888888,
            textureUrl: './textures/satellites/phobos.jpg'  // NASA火卫一纹理
        },
        { 
            name: 'deimos', 
            radius: 0.2, 
            orbitRadius: 7, 
            speed: 0.015, 
            color: 0x666666,
            textureUrl: './textures/satellites/deimos.jpg'  // NASA火卫二纹理
        }
    ],
    jupiter: [
        { 
            name: 'io', 
            radius: 0.8, 
            orbitRadius: 10, 
            speed: 0.025, 
            color: 0xFFD700,
            textureUrl: './textures/satellites/io.jpg'  // NASA木卫一纹理
        },
        { 
            name: 'europa', 
            radius: 0.7, 
            orbitRadius: 12, 
            speed: 0.02, 
            color: 0xF0F8FF,
            textureUrl: './textures/satellites/europa.jpg'  // NASA木卫二纹理
        },
        { 
            name: 'ganymede', 
            radius: 1.2, 
            orbitRadius: 15, 
            speed: 0.015, 
            color: 0xDEB887,
            textureUrl: './textures/satellites/ganymede.jpg'  // NASA木卫三纹理
        },
        { 
            name: 'callisto', 
            radius: 1.1, 
            orbitRadius: 18, 
            speed: 0.01, 
            color: 0x8B4513,
            textureUrl: './textures/satellites/callisto.jpg'  // NASA木卫四纹理
        }
    ],
    saturn: [
        { 
            name: 'titan', 
            radius: 1.0, 
            orbitRadius: 12, 
            speed: 0.02, 
            color: 0xFFE4B5,
            textureUrl: './textures/satellites/titan.jpg'  // NASA土卫六纹理
        },
        { 
            name: 'rhea', 
            radius: 0.4, 
            orbitRadius: 15, 
            speed: 0.015, 
            color: 0xD3D3D3,
            textureUrl: './textures/satellites/rhea.jpg'  // NASA土卫五纹理
        }
    ],
    uranus: [
        { 
            name: 'titania', 
            radius: 0.5, 
            orbitRadius: 8, 
            speed: 0.02, 
            color: 0xE0FFFF,
            textureUrl: './textures/satellites/titania.jpg'  // NASA天卫三纹理
        },
        { 
            name: 'oberon', 
            radius: 0.45, 
            orbitRadius: 10, 
            speed: 0.015, 
            color: 0xF0FFFF,
            textureUrl: './textures/satellites/oberon.jpg'  // NASA天卫四纹理
        }
    ],
    neptune: [
        { 
            name: 'triton', 
            radius: 0.6, 
            orbitRadius: 10, 
            speed: 0.02, 
            color: 0xADD8E6,
            textureUrl: './textures/satellites/triton.jpg'  // NASA海卫一纹理
        }
    ]
};

// 修改创建卫星函数
function createSatellite(data, planet) {
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    
    // 创建程序化生成的纹理
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // 创建渐变背景
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // 使用卫星的基础颜色创建渐变
    const color = new THREE.Color(data.color);
    gradient.addColorStop(0, `rgb(${color.r * 255 * 1.2}, ${color.g * 255 * 1.2}, ${color.b * 255 * 1.2})`);
    gradient.addColorStop(1, `rgb(${color.r * 255 * 0.8}, ${color.g * 255 * 0.8}, ${color.b * 255 * 0.8})`);
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 添加随机的陨石坑
    const craterCount = Math.floor(Math.random() * 20) + 10;
    for (let i = 0; i < craterCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 20 + 5;
        
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(60, 60, 60, 0.3)`;
        context.fill();
        
        // 添加陨石坑的高光
        context.beginPath();
        context.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.8, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, 0.1)`;
        context.fill();
    }
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    
    // 创建材质
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: 0.02,
        shininess: 5
    });
    
    const satellite = new THREE.Mesh(geometry, material);
    satellite.castShadow = true;
    satellite.receiveShadow = true;
    planet.add(satellite);
    
    // 创建卫星轨道
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitVertices = [];
    const segments = 64;
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitVertices.push(
            data.orbitRadius * Math.cos(theta),
            0,
            data.orbitRadius * Math.sin(theta)
        );
    }
    
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitVertices, 3));
    const orbitMaterial = new THREE.LineBasicMaterial({ 
        color: 0x444444,
        transparent: true,
        opacity: 0.3
    });
    
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    planet.add(orbit);
    
    return {
        mesh: satellite,
        orbit: orbit,
        angle: Math.random() * Math.PI * 2,
        data: data
    };
}

// 创建轨道线
function createOrbitLine(radius) {
    const segments = 128;
    const material = new THREE.LineBasicMaterial({ 
        color: 0x888888,  // 更亮的灰色
        transparent: true,
        opacity: 0.5,     // 增加不透明度
        linewidth: 2      // 注意：由于WebGL限制，线宽可能在某些浏览器中不起作用
    });
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
            radius * Math.cos(theta),
            0,
            radius * Math.sin(theta)
        );
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return new THREE.Line(geometry, material);
}

// 创建星空背景
function createStarfield() {
    // 创建星空纹理
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext('2d');

    // 设置黑色背景
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 添加星星
    const starCount = 5000; // 增加背景星星数量
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 0.5 + 0.3; // 增加星星大小范围
        const alpha = Math.random() * 0.3 + 0.2; // 增加星星亮度

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        context.fill();
    }

    // 创建纹理
    const starfieldTexture = new THREE.CanvasTexture(canvas);
    starfieldTexture.needsUpdate = true;

    // 创建星空球体
    const starfieldGeometry = new THREE.SphereGeometry(1500, 64, 64);
    const starfieldMaterial = new THREE.MeshBasicMaterial({
        map: starfieldTexture,
        side: THREE.BackSide,
        depthWrite: false
    });
    starfield = new THREE.Mesh(starfieldGeometry, starfieldMaterial);
    starfield.renderOrder = -1;
    scene.add(starfield);
}

// 创建闪烁的星星
function createStars() {
    const starGeometry = new THREE.SphereGeometry(0.5, 16, 16); // 增大基础星星大小
    const starMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 3.0, // 增加初始发光强度
        metalness: 0.0,
        roughness: 0.0,
        depthWrite: false,
        transparent: true,
        opacity: 1.0
    });

    for (let i = 0; i < STAR_COUNT; i++) {
        const star = new THREE.Mesh(starGeometry, starMaterial);
        
        // 随机位置，增加分布范围
        const radius = 400 + Math.random() * 300; // 调整分布范围，使星星更集中
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        
        star.position.x = radius * Math.sin(theta) * Math.cos(phi);
        star.position.y = radius * Math.sin(theta) * Math.sin(phi);
        star.position.z = radius * Math.cos(theta);
        
        stars.push({
            mesh: star,
            originalScale: 1,
            originalIntensity: 3.0, // 增加初始发光强度
            isFlashing: false,
            flashStartTime: 0,
            flashPhase: 0
        });
        
        scene.add(star);
    }
}

// 创建彗星
function createComets() {
    // 彗星本体使用更高细节的几何体
    const cometGeometry = new THREE.SphereGeometry(2, 32, 32);
    
    // 创建程序生成的彗星纹理
    const cometTextureCanvas = document.createElement('canvas');
    cometTextureCanvas.width = 1024;
    cometTextureCanvas.height = 512;
    const cometContext = cometTextureCanvas.getContext('2d');
    
    // 填充深灰色背景
    cometContext.fillStyle = '#333333';
    cometContext.fillRect(0, 0, cometTextureCanvas.width, cometTextureCanvas.height);
    
    // 添加表面的不规则性
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * cometTextureCanvas.width;
        const y = Math.random() * cometTextureCanvas.height;
        const radius = Math.random() * 4 + 1;
        const grayValue = Math.floor(Math.random() * 100) + 80; // 80-180的灰度值
        
        cometContext.beginPath();
        cometContext.arc(x, y, radius, 0, Math.PI * 2);
        cometContext.fillStyle = `rgb(${grayValue}, ${grayValue-30}, ${grayValue-60})`;
        cometContext.fill();
    }
    
    // 添加一些明亮的区域
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * cometTextureCanvas.width;
        const y = Math.random() * cometTextureCanvas.height;
        const radius = Math.random() * 20 + 10;
        
        const gradient = cometContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 240, 200, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 240, 200, 0)');
        
        cometContext.beginPath();
        cometContext.arc(x, y, radius, 0, Math.PI * 2);
        cometContext.fillStyle = gradient;
        cometContext.fill();
    }
    
    // 创建纹理
    const cometTexture = new THREE.CanvasTexture(cometTextureCanvas);
    
    // 创建彗星材质 - 使用生成的纹理
    const cometMaterial = new THREE.MeshPhongMaterial({ 
        map: cometTexture,
        bumpMap: cometTexture,  // 使用纹理作为凹凸贴图
        bumpScale: 0.2,         // 凹凸程度
        shininess: 5,           // 低光泽度
        emissive: 0x222222,     // 轻微自发光
        emissiveIntensity: 0.2
    });

    // 只创建一个彗星
    const comet = new THREE.Mesh(cometGeometry, cometMaterial);
    
    // 设置固定的初始位置，便于观察
    const radius = 200;
    const theta = Math.PI / 4; // 固定角度，便于找到彗星
    const phi = Math.PI / 6;
    
    comet.position.x = radius * Math.sin(theta) * Math.cos(phi);
    comet.position.y = radius * Math.sin(theta) * Math.sin(phi);
    comet.position.z = radius * Math.cos(theta);
    
    // 计算朝向太阳的方向
    const direction = new THREE.Vector3(
        -comet.position.x,
        -comet.position.y,
        -comet.position.z
    ).normalize();
    
    // 添加一些切向分量，使彗星沿椭圆轨道运动
    const perpVector = new THREE.Vector3(
        -comet.position.z,
        0,
        comet.position.x
    ).normalize();
    
    // 混合方向向量
    direction.add(perpVector.multiplyScalar(0.6)).normalize();
    
    comets.push({
        mesh: comet,
        speed: 1.0, // 降低速度使运动更平滑
        direction: direction,
        originalScale: 1,
        originalOpacity: 1.0
    });
    
    scene.add(comet);
    
    // 将彗星添加到planets对象中
    planets.comet = comet;
    
    // 创建彗星尾巴纹理
    const tailTextureCanvas = document.createElement('canvas');
    tailTextureCanvas.width = 512;
    tailTextureCanvas.height = 512;
    const tailContext = tailTextureCanvas.getContext('2d');
    
    // 创建径向渐变作为尾巴纹理
    const tailGradient = tailContext.createRadialGradient(
        tailTextureCanvas.width / 2, tailTextureCanvas.height / 2, 0,
        tailTextureCanvas.width / 2, tailTextureCanvas.height / 2, tailTextureCanvas.width / 2
    );
    tailGradient.addColorStop(0, 'rgba(255, 255, 200, 1.0)');
    tailGradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.8)');
    tailGradient.addColorStop(0.4, 'rgba(200, 180, 50, 0.6)');
    tailGradient.addColorStop(0.8, 'rgba(100, 100, 50, 0.2)');
    tailGradient.addColorStop(1, 'rgba(50, 50, 50, 0)');
    
    tailContext.fillStyle = tailGradient;
    tailContext.fillRect(0, 0, tailTextureCanvas.width, tailTextureCanvas.height);
    
    // 添加一些随机的光斑
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * tailTextureCanvas.width;
        const y = Math.random() * tailTextureCanvas.height;
        const radius = Math.random() * 6 + 2;
        
        tailContext.beginPath();
        tailContext.arc(x, y, radius, 0, Math.PI * 2);
        tailContext.fillStyle = 'rgba(255, 255, 200, 0.5)';
        tailContext.fill();
    }
    
    const tailTexture = new THREE.CanvasTexture(tailTextureCanvas);
    
    // 创建彗星尾巴 - 使用圆锥体，但更长更详细
    const tailGeometry = new THREE.ConeGeometry(2.5, 35, 32); 
    const tailMaterial = new THREE.MeshPhongMaterial({
        map: tailTexture,
        transparent: true,
        opacity: 0.8,
        emissive: 0xffffaa,   // 黄色发光
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide // 双面渲染
    });
    
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0, -17); // 放在彗星后面
    tail.rotation.x = Math.PI / 2;
    comet.add(tail);
    
    // 添加粒子系统作为额外尾巴效果
    const particleCount = 1000;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        // 粒子分布在锥形区域内
        const z = -Math.random() * 40 - 10; // 负z轴方向，彗星后面
        const radius = Math.random() * ((-z) / 10); // 越远离彗星，锥形越宽
        const theta = Math.random() * Math.PI * 2;
        
        particlePositions[i * 3] = radius * Math.cos(theta);
        particlePositions[i * 3 + 1] = radius * Math.sin(theta);
        particlePositions[i * 3 + 2] = z;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // 创建粒子纹理
    const particleTextureCanvas = document.createElement('canvas');
    particleTextureCanvas.width = 64;
    particleTextureCanvas.height = 64;
    const particleContext = particleTextureCanvas.getContext('2d');
    
    // 创建圆形渐变作为粒子纹理
    const particleGradient = particleContext.createRadialGradient(
        particleTextureCanvas.width / 2, particleTextureCanvas.height / 2, 0,
        particleTextureCanvas.width / 2, particleTextureCanvas.height / 2, particleTextureCanvas.width / 2
    );
    particleGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    particleGradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.8)');
    particleGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    
    particleContext.fillStyle = particleGradient;
    particleContext.fillRect(0, 0, particleTextureCanvas.width, particleTextureCanvas.height);
    
    const particleTexture = new THREE.CanvasTexture(particleTextureCanvas);
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffcc,
        size: 0.8,
        transparent: true,
        opacity: 0.4,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particles = new THREE.Points(particlesGeometry, particleMaterial);
    comet.add(particles);
    
    // 输出调试信息
    console.log("彗星创建完成，位置:", comet.position);
}

// 更新闪烁的星星
function updateFlashingStars(currentTime) {
    // 计算当前正在闪烁的星星数量
    const currentFlashingCount = stars.filter(star => star.isFlashing).length;
    
    // 每颗星星独立判断是否需要闪烁
    stars.forEach(star => {
        // 如果星星当前没有在闪烁
        if (!star.isFlashing) {
            // 只有当闪烁星星数量小于最大值时，才允许新的星星开始闪烁
            if (currentFlashingCount < MAX_FLASHING_STARS) {
                // 随机决定是否开始闪烁（每颗星星有0.01%的概率开始闪烁）
                if (Math.random() < 0.0001) {
                    star.isFlashing = true;
                    star.flashStartTime = currentTime;
                    star.flashPhase = 0;
                }
            }
        } else {
            // 如果星星正在闪烁，更新闪烁效果
            const elapsed = currentTime - star.flashStartTime;
            
            switch (star.flashPhase) {
                case 0: // 增长阶段
                    if (elapsed < 1000) { // 1秒增长
                        const progress = elapsed / 1000;
                        const scale = 1 + (4 * progress); // 1到5倍大小
                        const intensity = star.originalIntensity + (8 * progress); // 3到11倍亮度
                        
                        star.mesh.scale.set(scale, scale, scale);
                        star.mesh.material.emissiveIntensity = intensity;
                    } else {
                        star.flashPhase = 1;
                        star.flashStartTime = currentTime;
                    }
                    break;
                    
                case 1: // 保持阶段
                    if (elapsed < 1000) { // 保持1秒
                        star.mesh.scale.set(5, 5, 5);
                        star.mesh.material.emissiveIntensity = 11.0;
                    } else {
                        star.flashPhase = 2;
                        star.flashStartTime = currentTime;
                    }
                    break;
                    
                case 2: // 缩小阶段
                    if (elapsed < 1000) { // 1秒缩小
                        const progress = elapsed / 1000;
                        const scale = 5 - (4 * progress); // 5倍到1倍大小
                        const intensity = 11 - (8 * progress); // 11倍到3倍亮度
                        
                        star.mesh.scale.set(scale, scale, scale);
                        star.mesh.material.emissiveIntensity = intensity;
                    } else {
                        star.isFlashing = false;
                        star.mesh.scale.set(star.originalScale, star.originalScale, star.originalScale);
                        star.mesh.material.emissiveIntensity = star.originalIntensity;
                    }
                    break;
            }
        }
    });
}

// 更新彗星位置
function updateComets() {
    comets.forEach(comet => {
        // 移动彗星
        const clonedDirection = comet.direction.clone();
        comet.mesh.position.add(clonedDirection.multiplyScalar(comet.speed));
        
        // 计算彗星到太阳的距离
        const distance = comet.mesh.position.length();
        
        // 根据距离动态调整彗星速度（遵循开普勒第二定律，越靠近太阳速度越快）
        const newSpeed = 0.7 + 2.0 / Math.max(50, distance / 2);
        comet.speed = 0.98 * comet.speed + 0.02 * newSpeed; // 平滑速度变化
        
        // 根据距离调整彗星大小和亮度
        const scale = Math.min(1.5, 0.9 + (200 - Math.min(distance, 200)) / 200);
        comet.mesh.scale.set(scale, scale, scale);
        
        // 如果彗星飞出太远或太近，重置位置
        if (distance > 300 || distance < 30) {
            // 重置到固定位置
            const radius = 200;
            const theta = Math.PI / 4;
            const phi = Math.PI / 6;
            
            comet.mesh.position.x = radius * Math.sin(theta) * Math.cos(phi);
            comet.mesh.position.y = radius * Math.sin(theta) * Math.sin(phi);
            comet.mesh.position.z = radius * Math.cos(theta);
            
            // 重新计算方向
            comet.direction = new THREE.Vector3(
                -comet.mesh.position.x,
                -comet.mesh.position.y,
                -comet.mesh.position.z
            ).normalize();
            
            // 添加切向分量形成椭圆轨道
            const perpVector = new THREE.Vector3(
                -comet.mesh.position.z,
                0,
                comet.mesh.position.x
            ).normalize();
            
            // 混合两个方向向量
            comet.direction.add(perpVector.multiplyScalar(0.6)).normalize();
            comet.speed = 1.0; // 重置速度
            
            console.log("彗星重置位置:", comet.mesh.position);
        }
        
        // 调整彗星的朝向，让尾巴始终指向太阳的反方向
        if (comet.mesh.children.length > 0) {
            const directionToSun = new THREE.Vector3(
                -comet.mesh.position.x,
                -comet.mesh.position.y,
                -comet.mesh.position.z
            ).normalize();
            
            // 计算旋转角度
            comet.mesh.lookAt(
                comet.mesh.position.x + directionToSun.x,
                comet.mesh.position.y + directionToSun.y,
                comet.mesh.position.z + directionToSun.z
            );
            
            // 调整尾巴的旋转，确保指向正确的方向
            comet.mesh.rotateX(Math.PI/2);
            
            // 根据距离调整尾巴长度 - 越接近太阳尾巴越长
            const tailScale = Math.min(3.0, 1.0 + (300 - Math.min(distance, 300)) / 100);
            
            // 获取尾巴对象
            const tail = comet.mesh.children[0];
            if (tail) {
                tail.scale.set(1, tailScale, 1);
            }
            
            // 根据距离调整粒子尾巴的透明度
            const particles = comet.mesh.children[1];
            if (particles && particles instanceof THREE.Points) {
                particles.material.opacity = Math.min(0.7, 0.3 + (200 - Math.min(distance, 200)) / 200);
            }
        }
    });
}

// 修改显示行星信息的函数
function showPlanetInfo(planetName) {
    const planet = planetInfo[planetName];
    if (!planet) return;

    // 创建弹窗容器
    const modal = document.createElement('div');
    modal.className = 'planet-info-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1000;
        max-width: 80%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid #444;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        right: 15px;
        top: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 2px solid rgba(255, 0, 0, 0.5);
        color: #ff4444;
        font-size: 28px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 1003;
    `;
    
    // 添加悬停效果
    closeButton.onmouseover = () => {
        closeButton.style.background = 'rgba(255, 0, 0, 0.4)';
        closeButton.style.borderColor = 'rgba(255, 0, 0, 0.8)';
        closeButton.style.transform = 'rotate(90deg)';
    };
    
    closeButton.onmouseout = () => {
        closeButton.style.background = 'rgba(255, 0, 0, 0.2)';
        closeButton.style.borderColor = 'rgba(255, 0, 0, 0.5)';
        closeButton.style.transform = 'rotate(0deg)';
    };
    
    closeButton.onclick = () => modal.remove();

    // 创建标题头
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h2 style="color: #00ff00; margin: 0;">${planet.name}</h2>
    `;

    // 创建内容容器
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
        margin-top: 20px;
        line-height: 1.6;
    `;

    // 如果是系外彗星,显示特殊的信息
    if (planetName === 'comet') {
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">基本特征</h3>
                <p>系外彗星是指来自太阳系以外的彗星。这些彗星可能来自其他恒星系统，或者是在星际空间中形成的。</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">物理特性</h3>
                <p>• 半径: ${planet.radius}</p>
                <p>• 轨道范围: ${planet.distance}</p>
                <p>• 速度: ${planet.speed}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">组成成分</h3>
                <p>• 冰</p>
                <p>• 尘埃</p>
                <p>• 岩石</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">科学意义</h3>
                <p>系外彗星的发现对于理解宇宙中彗星的形成和演化具有重要意义。它们可能携带了其他恒星系统的物质信息，有助于我们了解宇宙的化学组成和演化历史。</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">研究进展</h3>
                <p>目前，科学家们正在通过多种观测手段寻找和研究系外彗星。这些研究包括：</p>
                <ul>
                    <li>通过光谱分析研究彗星的化学成分</li>
                    <li>观测彗星的轨道特征和运动规律</li>
                    <li>研究彗星与恒星的相互作用</li>
                </ul>
            </div>
        `;
    } else {
        // 其他天体的信息显示
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">基本特征</h3>
                <p>• 半径: ${planet.radius}</p>
                <p>• 距离: ${planet.distance}</p>
                <p>• 速度: ${planet.speed}</p>
            </div>
            ${planet.satellites.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #00ff00;">卫星</h3>
                    ${planet.satellites.map(satellite => `
                        <p>• ${satellite.name}</p>
                        <p>  半径: ${satellite.radius}</p>
                        <p>  距离: ${satellite.distance}</p>
                        <p>  速度: ${satellite.speed}</p>
                    `).join('')}
                </div>
            ` : ''}
            <div style="margin-bottom: 20px;">
                <h3 style="color: #00ff00;">特殊信息</h3>
                <p>• 类型: ${planet.special.type}</p>
                ${planet.special.age ? `<p>• 年龄: ${planet.special.age}</p>` : ''}
                ${planet.special.composition ? `<p>• 组成: ${planet.special.composition}</p>` : ''}
                ${planet.special.habitability ? `<p>• 宜居性: ${planet.special.habitability}</p>` : ''}
                ${planet.special.orbit ? `<p>• 轨道: ${planet.special.orbit}</p>` : ''}
                ${planet.special.tail ? `<p>• 彗尾: ${planet.special.tail}</p>` : ''}
                ${planet.special.probes ? `
                    <p>• 探测器:</p>
                    <ul>
                        ${planet.special.probes.map(probe => `
                            <li>${probe.name} (${probe.year})</li>
                        `).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }

    modal.appendChild(closeButton);
    modal.appendChild(header);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// 关闭弹窗的函数
window.closeModal = function() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('planetModal').style.display = 'none';
}

// 添加点击事件监听
function onMouseClick(event) {
    // 计算鼠标在归一化设备坐标中的位置
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新射线投射器
    raycaster.setFromCamera(mouse, camera);

    // 检测射线与行星的相交
    const intersects = raycaster.intersectObjects(scene.children, true);

    // 遍历相交的对象
    for (const intersect of intersects) {
        const object = intersect.object;
        
        // 检查是否是彗星
        for (const comet of comets) {
            if (object === comet.mesh || 
                object.parent === comet.mesh || 
                (comet.mesh.children && comet.mesh.children.includes(object)) ||
                (comet.mesh.children && comet.mesh.children.includes(object.parent))) {
                showPlanetInfo('comet');
                return;
            }
        }
        
        // 检查是否是行星
        for (const planetName in planetInfo) {
            const planet = planets[planetName];
            if (!planet) continue;

            // 检查对象本身、父对象或子对象是否匹配
            if (object === planet || 
                object.parent === planet || 
                (planet.children && planet.children.includes(object)) ||
                (planet.children && planet.children.includes(object.parent))) {
                showPlanetInfo(planetName);
                return;
            }
        }
    }
}

// 添加双击事件处理
let lastClickTime = 0;
function onMouseDoubleClick(event) {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime < 300) { // 300ms内的点击视为双击
        // 计算鼠标在归一化设备坐标中的位置
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 更新射线投射器
        raycaster.setFromCamera(mouse, camera);

        // 检测射线与行星的相交
        const intersects = raycaster.intersectObjects(scene.children, true);

        // 遍历相交的对象
        for (const intersect of intersects) {
            const object = intersect.object;
            
            // 检查是否是行星
            for (const planetName in planetInfo) {
                const planet = planets[planetName];
                if (!planet) continue;

                // 检查对象本身、父对象或子对象是否匹配
                if (object === planet || 
                    object.parent === planet || 
                    (planet.children && planet.children.includes(object)) ||
                    (planet.children && planet.children.includes(object.parent))) {
                    showPlanetDetailView(planetName);
                    return;
                }
            }
        }
    }
    lastClickTime = currentTime;
}

// 创建行星详细视图
function showPlanetDetailView(planetName) {
    // 创建新的场景容器
    const detailContainer = document.createElement('div');
    detailContainer.className = 'planet-detail-container';
    detailContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    `;

    // 创建头部控制栏
    const header = document.createElement('div');
    header.className = 'detail-header';
    header.style.cssText = `
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 0, 40, 0.5);
        border-bottom: 1px solid rgba(0, 150, 255, 0.3);
    `;

    // 添加标题
    const title = document.createElement('h2');
    title.textContent = planetInfo[planetName].name;
    title.style.color = '#00ff00';
    title.style.margin = '0';

    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        background: none;
        border: none;
        color: #ff4444;
        font-size: 24px;
        cursor: pointer;
        padding: 5px 10px;
        transition: all 0.3s ease;
    `;

    closeButton.onmouseover = () => {
        closeButton.style.transform = 'rotate(90deg)';
    };

    closeButton.onmouseout = () => {
        closeButton.style.transform = 'rotate(0deg)';
    };

    closeButton.onclick = () => {
        detailContainer.remove();
        // 恢复主场景的动画
        isAnimating = true;
    };

    header.appendChild(title);
    header.appendChild(closeButton);

    // 创建内容区域
    const content = document.createElement('div');
    content.style.cssText = `
        flex: 1;
        display: flex;
        position: relative;
    `;

    // 创建3D视图容器
    const view3d = document.createElement('div');
    view3d.id = 'planet-detail-view';
    view3d.style.cssText = `
        flex: 1;
        position: relative;
    `;

    // 创建信息面板
    const infoPanel = document.createElement('div');
    infoPanel.className = 'detail-info-panel';
    infoPanel.style.cssText = `
        width: 300px;
        background: rgba(0, 0, 40, 0.8);
        padding: 20px;
        color: white;
        overflow-y: auto;
        border-left: 1px solid rgba(0, 150, 255, 0.3);
    `;

    // 添加行星信息
    const planet = planetInfo[planetName];
    infoPanel.innerHTML = `
        <h3 style="color: #00ff00;">基本信息</h3>
        <p>• 半径: ${planet.radius}</p>
        <p>• 距离: ${planet.distance}</p>
        <p>• 速度: ${planet.speed}</p>
        ${planet.satellites.length > 0 ? `
            <h3 style="color: #00ff00; margin-top: 20px;">卫星系统</h3>
            ${planet.satellites.map(satellite => `
                <div style="margin: 10px 0; padding: 10px; background: rgba(0, 150, 255, 0.1); border-radius: 5px;">
                    <p style="color: #00ffff;">${satellite.name}</p>
                    <p>• 半径: ${satellite.radius}</p>
                    <p>• 距离: ${satellite.distance}</p>
                    <p>• 速度: ${satellite.speed}</p>
                </div>
            `).join('')}
        ` : ''}
        <h3 style="color: #00ff00; margin-top: 20px;">特殊信息</h3>
        <p>• 类型: ${planet.special.type}</p>
        ${planet.special.age ? `<p>• 年龄: ${planet.special.age}</p>` : ''}
        ${planet.special.composition ? `<p>• 组成: ${planet.special.composition}</p>` : ''}
        ${planet.special.habitability ? `<p>• 宜居性: ${planet.special.habitability}</p>` : ''}
    `;

    content.appendChild(view3d);
    content.appendChild(infoPanel);

    detailContainer.appendChild(header);
    detailContainer.appendChild(content);
    document.body.appendChild(detailContainer);

    // 创建新的Three.js场景
    const detailScene = new THREE.Scene();
    const detailCamera = new THREE.PerspectiveCamera(75, (window.innerWidth - 300) / window.innerHeight, 0.1, 1000);
    const detailRenderer = new THREE.WebGLRenderer({ antialias: true });
    detailRenderer.setSize(window.innerWidth - 300, window.innerHeight);
    view3d.appendChild(detailRenderer.domElement);

    // 添加环境光和平行光
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    detailScene.add(ambientLight);
    detailScene.add(ambientLight);

    // 创建行星
    const planetGeometry = new THREE.SphereGeometry(5, 64, 64);
    const planetMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load(`./textures/planets/2k_${planetName}.jpg`),
        shininess: 30
    });
    const detailPlanet = new THREE.Mesh(planetGeometry, planetMaterial);
    detailScene.add(detailPlanet);

    // 创建卫星
    if (planet.satellites.length > 0) {
        planet.satellites.forEach(satellite => {
            const satelliteGeometry = new THREE.SphereGeometry(1, 32, 32);
            const satelliteMaterial = new THREE.MeshPhongMaterial({
                color: 0xcccccc,
                shininess: 30
            });
            const satelliteMesh = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
            
            // 创建卫星轨道
            const orbitGeometry = new THREE.RingGeometry(satellite.distance - 0.1, satellite.distance + 0.1, 128);
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0x666666,
                side: THREE.DoubleSide,
                opacity: 0.3,
                transparent: true
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            
            detailScene.add(orbit);
            detailScene.add(satelliteMesh);
            
            // 存储卫星信息
            satelliteMesh.userData = {
                orbitRadius: satellite.distance,
                speed: satellite.speed,
                angle: Math.random() * Math.PI * 2
            };
        });
    }

    // 设置相机位置
    detailCamera.position.z = 20;

    // 添加轨道控制器
    const detailControls = new THREE.OrbitControls(detailCamera, detailRenderer.domElement);
    detailControls.enableDamping = true;
    detailControls.dampingFactor = 0.05;

    // 动画循环
    function animateDetail() {
        requestAnimationFrame(animateDetail);

        // 更新行星自转
        detailPlanet.rotation.y += 0.005;

        // 更新卫星位置
        if (planet.satellites.length > 0) {
            detailScene.children.forEach(child => {
                if (child.userData.orbitRadius) {
                    child.userData.angle += child.userData.speed;
                    child.position.x = Math.cos(child.userData.angle) * child.userData.orbitRadius;
                    child.position.z = Math.sin(child.userData.angle) * child.userData.orbitRadius;
                    child.rotation.y += 0.01;
                }
            });
        }

        detailControls.update();
        detailRenderer.render(detailScene, detailCamera);
    }

    animateDetail();

    // 处理窗口大小变化
    window.addEventListener('resize', () => {
        detailCamera.aspect = (window.innerWidth - 300) / window.innerHeight;
        detailCamera.updateProjectionMatrix();
        detailRenderer.setSize(window.innerWidth - 300, window.innerHeight);
    });
}

// 初始化场景
function init() {
    // 创建太阳
    createSun();
    
    // 创建行星和它们的轨道
    createMercury();
    scene.add(createOrbitLine(orbits.mercury.radius));
    
    createVenus();
    scene.add(createOrbitLine(orbits.venus.radius));
    
    createEarth();
    scene.add(createOrbitLine(orbits.earth.radius));
    
    createMars();
    scene.add(createOrbitLine(orbits.mars.radius));
    
    createJupiter();
    scene.add(createOrbitLine(orbits.jupiter.radius));
    
    createSaturn();
    scene.add(createOrbitLine(orbits.saturn.radius));
    
    createUranus();
    scene.add(createOrbitLine(orbits.uranus.radius));
    
    createNeptune();
    scene.add(createOrbitLine(orbits.neptune.radius));

    // 添加星空和彗星
    createStarfield();
    createStars();
    createComets();

    // 创建名称标签
    for (const planetName in planetInfo) {
        if (planets[planetName] || planetName === 'comet') {
            createNameLabel(planetName, planetName === 'comet' ? planets.comet : planets[planetName]);
        }
    }

    // 添加名称显示开关事件监听
    document.getElementById('showNames').addEventListener('change', (e) => {
        showNames = e.target.checked;
        if (!showNames) {
            // 隐藏所有标签
            for (const label of Object.values(nameLabels)) {
                label.classList.remove('visible');
            }
        }
    });

    controls.update();

    // 添加点击事件监听
    window.addEventListener('click', onMouseClick, false);

    // 添加双击事件监听
    window.addEventListener('dblclick', onMouseDoubleClick, false);
}

// 动画循环
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 1;

    const currentTime = Date.now();
    
    // 更新闪烁的星星
    updateFlashingStars(currentTime);
    
    // 更新彗星位置
    updateComets();

    // 更新所有行星的自转
    updatePlanetRotation(planets.mercury, 0.04);  // 水星自转
    updatePlanetRotation(planets.venus, -0.03);   // 金星自转（逆向自转）
    updatePlanetRotation(planets.earth, 0.04);    // 地球自转
    updatePlanetRotation(planets.mars, 0.035);    // 火星自转
    updatePlanetRotation(planets.jupiter, 0.08);  // 木星自转
    updatePlanetRotation(planets.saturn, 0.075);  // 土星自转
    updatePlanetRotation(planets.uranus, 0.07);   // 天王星自转
    updatePlanetRotation(planets.neptune, 0.065); // 海王星自转

    // 更新所有行星的公转（围绕太阳）
    updatePlanetOrbit(planets.mercury, 0, 0, orbits.mercury.radius, orbits.mercury.speed, time);
    updatePlanetOrbit(planets.venus, 0, 0, orbits.venus.radius, orbits.venus.speed, time);
    updatePlanetOrbit(planets.earth, 0, 0, orbits.earth.radius, orbits.earth.speed, time);
    updatePlanetOrbit(planets.mars, 0, 0, orbits.mars.radius, orbits.mars.speed, time);
    updatePlanetOrbit(planets.jupiter, 0, 0, orbits.jupiter.radius, orbits.jupiter.speed, time);
    updatePlanetOrbit(planets.saturn, 0, 0, orbits.saturn.radius, orbits.saturn.speed, time);
    updatePlanetOrbit(planets.uranus, 0, 0, orbits.uranus.radius, orbits.uranus.speed, time);
    updatePlanetOrbit(planets.neptune, 0, 0, orbits.neptune.radius, orbits.neptune.speed, time);

    // 更新所有卫星的位置
    for (const planetName in planets.satelliteGroups) {
        const satelliteGroup = planets.satelliteGroups[planetName];
        if (satelliteGroup) {
            satelliteGroup.forEach(satellite => {
                if (satellite && satellite.mesh && isAnimating) {
                    // 更新卫星角度
                    satellite.angle += satellite.data.speed;
                    
                    // 计算卫星新位置
                    const x = satellite.data.orbitRadius * Math.cos(satellite.angle);
                    const z = satellite.data.orbitRadius * Math.sin(satellite.angle);
                    
                    // 更新卫星位置
                    satellite.mesh.position.set(x, 0, z);
                    
                    // 添加卫星自转
                    satellite.mesh.rotation.y += satellite.data.speed * 0.5;
                }
            });
        }
    }

    // 更新名称标签位置
    updateNameLabels();

    controls.update();
    renderer.render(scene, camera);
}

// 处理窗口大小变化
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 添加空格键控制动画暂停/继续
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        const isPlaying = toggleAnimation();
        console.log(isPlaying ? '动画继续' : '动画暂停');
    }
});

init();
animate(); 