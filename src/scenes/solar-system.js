// 定义场景、相机和渲染器
let scene, camera, renderer, controls;

// 定义太阳系天体
let sun, planets = {};

// 定义行星数据
const planetData = {
    mercury: { 
        radius: 0.383,
        distance: 5,
        speed: 0.04,
        textureUrl: '../assets/textures/mercury.jpg',
        color: 0x93764C,
        satellites: []
    },
    venus: { 
        radius: 0.949, 
        distance: 7,
        speed: 0.03,
        textureUrl: '../assets/textures/venus.jpg',
        color: 0xE6B87C,
        satellites: []
    },
    earth: { 
        radius: 1, 
        distance: 10,
        speed: 0.025,
        textureUrl: '../assets/textures/earth.jpg',
        color: 0x6B93D6,
        satellites: [
            {
                name: 'moon',
                radius: 0.273,
                distance: 2,
                speed: 0.05,
                textureUrl: '../assets/textures/moon.jpg',
                color: 0xCCCCCC
            }
        ]
    },
    mars: { 
        radius: 0.532, 
        distance: 13,
        speed: 0.02,
        textureUrl: '../assets/textures/mars.jpg',
        color: 0xC1440E,
        satellites: []
    },
    jupiter: { 
        radius: 11.209, 
        distance: 18,
        speed: 0.015,
        textureUrl: '../assets/textures/jupiter.jpg',
        color: 0xC88B3A,
        satellites: [
            {
                name: 'io',
                radius: 0.286,
                distance: 3,
                speed: 0.04,
                textureUrl: '../assets/textures/satellites/io.jpg',
                color: 0xFFFF00
            },
            {
                name: 'europa',
                radius: 0.245,
                distance: 4,
                speed: 0.035,
                textureUrl: '../assets/textures/satellites/europa.jpg',
                color: 0xCCCCCC
            }
        ]
    },
    saturn: { 
        radius: 9.449, 
        distance: 23,
        speed: 0.01,
        textureUrl: '../assets/textures/saturn.jpg',
        ringUrl: '../assets/textures/saturn-rings.png',
        color: 0xEAD6B8,
        satellites: []
    },
    uranus: { 
        radius: 4.007, 
        distance: 27,
        speed: 0.008,
        textureUrl: '../assets/textures/uranus.jpg',
        color: 0x82B3D1,
        satellites: []
    },
    neptune: { 
        radius: 3.883, 
        distance: 30,
        speed: 0.006,
        textureUrl: '../assets/textures/neptune.jpg',
        color: 0x2B55D3,
        satellites: []
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
        
        // 彗星本体 - 使用更大、更亮的球体
        const cometGeometry = new THREE.SphereGeometry(4, 32, 32);
        const cometMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF0000  // 纯红色
        });
        this.body = new THREE.Mesh(cometGeometry, cometMaterial);
        this.group.add(this.body);
        
        // 彗星尾巴 - 使用简单的圆锥体
        const tailGeometry = new THREE.ConeGeometry(5, 40, 32);
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00, // 黄色尾巴
            transparent: true,
            opacity: 0.8
        });
        this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
        this.tail.rotation.x = Math.PI / 2;
        this.tail.position.z = -20;
        this.group.add(this.tail);
        
        // 椭圆轨道参数 - 使用更明显的椭圆
        this.a = 50;          // 半长轴
        this.b = 20;          // 半短轴
        this.e = 0.6;         // 离心率
        this.period = 20;     // 周期（秒）
        this.startTime = Date.now();
        
        // 添加调试信息 - 移到前面创建
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        this.debugMarker = new THREE.Mesh(geometry, material);
        this.scene.add(this.debugMarker);
        
        // 创建一个明显的椭圆轨道
        this.createOrbit();
        
        // 初始位置 - 移到最后调用
        this.updatePosition(0);
        
        console.log('彗星创建完成');
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

// 初始化场景
function init() {
    try {
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // 创建相机
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 50;
        camera.position.y = 30;
        camera.lookAt(0, 0, 0);

        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        // 添加轨道控制器
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // 创建彗星
        console.log('准备在init中创建彗星...');
        comet = new Comet(scene);
        scene.add(comet.group);

        // 创建太阳
        const sunGeometry = new THREE.SphereGeometry(3, 64, 64);
        const sunTexture = textureLoader.load('textures/sun.jpg');
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            map: sunTexture,
            emissive: 0xffae42,
            emissiveIntensity: 1.0  // 增加发光强度
        });
        sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.castShadow = true;
        scene.add(sun);

        // 添加太阳光晕 - 增加大小和亮度
        const sunGlowGeometry = new THREE.SphereGeometry(3.5, 32, 32);  // 增加光晕大小
        const sunGlowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                viewVector: { value: camera.position }
            },
            vertexShader: `
                uniform vec3 viewVector;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normalMatrix * normal);
                    vec3 vNormel = normalize(normalMatrix * viewVector);
                    intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);  // 增加基础亮度
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float intensity;
                void main() {
                    vec3 glow = vec3(1.0, 0.7, 0.3) * intensity;  // 调整光晕颜色
                    gl_FragColor = vec4(glow, 1.0);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        scene.add(sunGlow);

        // 添加环境光 - 调整亮度
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);  // 降低环境光强度
        scene.add(ambientLight);

        // 添加点光源（太阳发出的光）- 增加强度和范围
        const pointLight = new THREE.PointLight(0xffffff, 3, 150);  // 增加光照强度和范围
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 2048;  // 增加阴影贴图分辨率
        pointLight.shadow.mapSize.height = 2048;
        scene.add(pointLight);

        // 创建行星
        createPlanets();

        // 添加星空背景
        createStarfield();

        // 调整相机位置，更远一些以便看到整个轨道
        camera.position.set(0, 80, 80);
        camera.lookAt(0, 0, 0);
        
        // 添加明显的信息标签
        const info = document.createElement('div');
        info.style.position = 'absolute';
        info.style.top = '10px';
        info.style.left = '10px';
        info.style.background = 'rgba(0,0,0,0.7)';
        info.style.color = '#ffffff';
        info.style.padding = '10px';
        info.style.fontSize = '16px';
        info.style.fontWeight = 'bold';
        info.innerHTML = '红色球体是彗星，黄色锥体是尾巴，按住鼠标并拖动可以旋转视角';
        document.body.appendChild(info);

        // 添加窗口大小改变的监听器
        window.addEventListener('resize', onWindowResize, false);

        // 开始动画循环
        animate();
        
        console.log('场景初始化完成');
    } catch (error) {
        console.error('初始化错误:', error);
        alert('初始化错误: ' + error.message);
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.innerHTML = `初始化错误: ${error.message}`;
        }
    }
}

// 创建行星
function createPlanets() {
    for (let planetName in planetData) {
        const data = planetData[planetName];
        
        // 创建行星几何体和材质 - 增加细节
        const geometry = new THREE.SphereGeometry(data.radius, 128, 128);  // 增加几何体细节
        let material;
        
        try {
            const texture = textureLoader.load(data.textureUrl);
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();  // 提高纹理质量
            material = new THREE.MeshPhongMaterial({ 
                map: texture,
                shininess: 15,  // 降低反光度使表面看起来更自然
                bumpScale: 0.05,  // 添加凹凸效果
                specular: 0x333333  // 减少镜面反射
            });
        } catch (error) {
            console.warn(`无法加载${planetName}的纹理，使用基础颜色`);
            material = new THREE.MeshPhongMaterial({ 
                color: data.color,
                shininess: 15,
                specular: 0x333333
            });
        }
        
        // 创建行星网格
        const planet = new THREE.Mesh(geometry, material);
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        // 创建行星轨道 - 使轨道更细致
        const orbitGeometry = new THREE.RingGeometry(data.distance - 0.05, data.distance + 0.05, 180);  // 增加轨道细节
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            side: THREE.DoubleSide,
            opacity: 0.2,  // 降低轨道透明度
            transparent: true
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        
        scene.add(orbit);
        scene.add(planet);
        
        // 如果是土星，添加光环 - 改进光环效果
        if (planetName === 'saturn') {
            try {
                const ringTexture = textureLoader.load(data.ringUrl);
                ringTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();  // 提高纹理质量
                const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 128);  // 增加环的大小和细节
                const ringMaterial = new THREE.MeshPhongMaterial({
                    map: ringTexture,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9,
                    shininess: 5,
                    specular: 0x222222
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                planet.add(ring);
            } catch (error) {
                console.warn('无法加载土星环的纹理');
            }
        }
        
        // 创建卫星系统
        const satellites = [];
        if (data.satellites.length > 0) {
            for (const satData of data.satellites) {
                const satGeometry = new THREE.SphereGeometry(satData.radius, 32, 32);
                let satMaterial;
                
                try {
                    const satTexture = textureLoader.load(satData.textureUrl);
                    satMaterial = new THREE.MeshPhongMaterial({
                        map: satTexture,
                        shininess: 30
                    });
                } catch (error) {
                    console.warn(`无法加载${satData.name}的纹理，使用基础颜色`);
                    satMaterial = new THREE.MeshPhongMaterial({
                        color: satData.color,
                        shininess: 30
                    });
                }
                
                const satellite = new THREE.Mesh(satGeometry, satMaterial);
                satellite.castShadow = true;
                satellite.receiveShadow = true;
                
                // 创建卫星轨道
                const satOrbitGeometry = new THREE.RingGeometry(satData.distance - 0.05, satData.distance + 0.05, 64);
                const satOrbitMaterial = new THREE.MeshBasicMaterial({
                    color: 0x444444,
                    side: THREE.DoubleSide,
                    opacity: 0.3,
                    transparent: true
                });
                const satOrbit = new THREE.Mesh(satOrbitGeometry, satOrbitMaterial);
                satOrbit.rotation.x = Math.PI / 2;
                
                planet.add(satOrbit);
                planet.add(satellite);
                
                satellites.push({
                    mesh: satellite,
                    angle: Math.random() * Math.PI * 2,
                    data: satData
                });
            }
        }
        
        planets[planetName] = {
            mesh: planet,
            angle: Math.random() * Math.PI * 2,
            data: data,
            satellites: satellites
        };
    }
}

// 创建星空背景
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
    });

    const starsVertices = [];
    for (let i = 0; i < 20000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
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
    
    // 更新控制器
    controls.update();
    
    // 更新彗星
    if (comet) {
        comet.updatePosition(Date.now());
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', init); 