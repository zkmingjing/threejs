// 导入必要的 Three.js 模块
import * as THREE from 'three';

// 纹理加载器
const textureLoader = new THREE.TextureLoader();

// 动画状态控制
export let isAnimating = true;

// 创建地球材质
export function createEarthMaterial() {
    // 加载地球的三个纹理：日间地图、夜间地图和云层
    const dayTexture = textureLoader.load('./textures/planets/2k_earth_daymap.jpg');
    const nightTexture = textureLoader.load('./textures/planets/2k_earth_nightmap.jpg');
    const cloudsTexture = textureLoader.load('./textures/planets/2k_earth_clouds.jpg');
    
    // 创建地球基础材质
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: dayTexture,
        specularMap: nightTexture,
        specular: new THREE.Color(0x333333),
        shininess: 15,
    });

    // 创建云层
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
    });

    return { earthMaterial, cloudsMaterial };
}

// 创建火星材质
export function createMarsMaterial() {
    const marsTexture = textureLoader.load('./textures/planets/2k_mars.jpg');
    return new THREE.MeshPhongMaterial({
        map: marsTexture,
        bumpMap: marsTexture,
        bumpScale: 0.2,
        shininess: 5,
    });
}

// 创建木星材质
export function createJupiterMaterial() {
    const jupiterTexture = textureLoader.load('./textures/planets/2k_jupiter.jpg');
    return new THREE.MeshPhongMaterial({
        map: jupiterTexture,
        bumpScale: 0.1,
        shininess: 10,
    });
}

// 创建土星材质
export function createSaturnMaterial() {
    const saturnTexture = textureLoader.load('./textures/planets/2k_saturn.jpg');
    const ringTexture = textureLoader.load('./textures/planets/2k_saturn_ring_alpha.png');
    
    // 土星本体材质
    const saturnMaterial = new THREE.MeshPhongMaterial({
        map: saturnTexture,
        bumpScale: 0.1,
        shininess: 10,
    });

    // 土星环材质
    const ringMaterial = new THREE.MeshPhongMaterial({
        map: ringTexture,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    return { saturnMaterial, ringMaterial };
}

// 创建土星环几何体
export function createSaturnRing(radius) {
    const innerRadius = radius * 1.2;
    const outerRadius = radius * 2;
    const segments = 64;
    
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
    return ringGeometry;
}

// 更新云层旋转
export function updateClouds(clouds, speed = 0.0003) {
    if (clouds && isAnimating) {
        clouds.rotation.y += speed;
    }
}

// 更新行星自转
export function updatePlanetRotation(planet, speed = 0.002) {
    if (planet && isAnimating) {
        planet.rotation.y += speed;
    }
}

// 更新行星公转
export function updatePlanetOrbit(planet, centerX, centerZ, radius, speed, time) {
    if (planet && isAnimating) {
        // 计算行星在轨道上的新位置
        const angle = time * speed;
        const x = centerX + radius * Math.cos(angle);
        const z = centerZ + radius * Math.sin(angle);
        
        // 更新行星位置
        planet.position.x = x;
        planet.position.z = z;
        
        // 如果这个行星有子对象（比如地球的云层或土星环），它们会自动跟随移动
        // 因为我们已经将它们设置为行星的子对象
    }
}

// 切换动画状态
export function toggleAnimation() {
    isAnimating = !isAnimating;
    return isAnimating;
}

// 创建水星材质
export function createMercuryMaterial() {
    return new THREE.MeshPhongMaterial({
        color: 0x8B8989,  // 灰色
        shininess: 10,
        emissive: 0x222222
    });
}

// 创建金星材质
export function createVenusMaterial() {
    return new THREE.MeshPhongMaterial({
        color: 0xE3DAC9,  // 米黄色
        shininess: 15,
        emissive: 0x222222
    });
}

// 创建天王星材质
export function createUranusMaterial() {
    return new THREE.MeshPhongMaterial({
        color: 0x4FD9FF,  // 浅蓝色
        shininess: 15,
        emissive: 0x222222
    });
}

// 创建海王星材质
export function createNeptuneMaterial() {
    return new THREE.MeshPhongMaterial({
        color: 0x4169E1,  // 深蓝色
        shininess: 15,
        emissive: 0x222222
    });
} 