import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Nectar3D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.set(22, 18, 22);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 50;

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.6, // Strength
            0.3, // Radius
            0.65 // Threshold
        );
        this.composer.addPass(bloomPass);

        this.initMaterials();
        this.initStudio();
        this.initBoard();
        
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.onClickCallback = null;

        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate(0);
    }

    initMaterials() {
        this.mats = {
            obsidian: new THREE.MeshStandardMaterial({ 
                color: 0x050510, 
                roughness: 0.1, 
                metalness: 0.9 
            }),
            gold: new THREE.MeshStandardMaterial({ 
                color: 0xc5a059, 
                roughness: 0.2, 
                metalness: 1.0,
                envMapIntensity: 1.0
            }),
            glass: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3,
                ior: 1.5,
                roughness: 0.1,
                metalness: 0,
                transmission: 0.8
            })
        };
    }

    initStudio() {
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.Fog(0x050505, 30, 80);

        // Grid/Table Surface
        const gridGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
        const gridMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.05,
            metalness: 0.3
        });
        const ground = new THREE.Mesh(gridGeo, gridMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -5.0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Studio Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        // Rim Light 1
        const rim1 = new THREE.SpotLight(0xffffff, 500);
        rim1.position.set(-20, 20, -20);
        rim1.angle = Math.PI / 4;
        rim1.penumbra = 1;
        rim1.castShadow = true;
        this.scene.add(rim1);

        // Key Light
        const key = new THREE.PointLight(0xf0d58e, 400); // Warm Gold
        key.position.set(15, 15, 10);
        key.castShadow = true;
        this.scene.add(key);

        // Fill Light
        const fill = new THREE.DirectionalLight(0x4444ff, 0.3); // Cool bluish fill
        fill.position.set(-10, 10, 10);
        this.scene.add(fill);
    }

    initBoard() {
        // Luxury Obsidian Slab
        const slabGeo = new THREE.CylinderGeometry(11, 11.5, 1.5, 64);
        const slab = new THREE.Mesh(slabGeo, this.mats.obsidian);
        slab.position.y = -1;
        slab.receiveShadow = true;
        slab.castShadow = true;
        this.scene.add(slab);

        // Top Gold Detail Ring
        const ringGeo = new THREE.TorusGeometry(10.8, 0.05, 8, 128);
        const ring = new THREE.Mesh(ringGeo, this.mats.gold);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.2;
        slab.add(ring);

        this.boardSurface = new THREE.Group();
        this.boardSurface.position.y = -0.2;
        this.scene.add(this.boardSurface);
    }

    createHex3D(q, r, type) {
        const hexRadius = 1.6;
        const x = hexRadius * Math.sqrt(3) * (q + r / 2);
        const z = hexRadius * 1.5 * r;

        const hexGroup = new THREE.Group();
        hexGroup.position.set(x, 0, z);

        // Fine etched line hex
        const hexLineGeo = new THREE.CylinderGeometry(hexRadius * 0.98, hexRadius * 0.98, 0.02, 6, 1, true);
        const hexLine = new THREE.Mesh(hexLineGeo, this.mats.gold);
        hexLine.rotation.y = Math.PI / 2;
        hexGroup.add(hexLine);

        // Interior surface
        const hexSurfGeo = new THREE.CylinderGeometry(hexRadius * 0.98, hexRadius * 0.98, 0.01, 6);
        let color = 0x0a0a10; 
        if (type === 'honeycomb') color = 0x151520;
        else if (type === 'pink') color = 0x201515;
        else if (type === 'black') color = 0x000000;
        else if (type === 'gold') color = 0x221a0a;

        const hexSurfMat = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.1,
            metalness: 0.8
        });
        const hexSurf = new THREE.Mesh(hexSurfGeo, hexSurfMat);
        hexSurf.rotation.y = Math.PI / 2;
        hexGroup.add(hexSurf);

        hexGroup.userData = { q, r, type };
        this.boardSurface.add(hexGroup);
        return hexGroup;
    }

    createBee3D(ownerId, color) {
        const beeGroup = new THREE.Group();
        
        // Luxury Capsule (Body)
        const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.4, 8, 16);
        const body = new THREE.Mesh(bodyGeo, this.mats.gold);
        body.rotation.z = Math.PI / 2;
        beeGroup.add(body);

        // Identification Ring (Colored Jewel)
        const gemGeo = new THREE.TorusGeometry(0.32, 0.05, 12, 24);
        const gemMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color, 
            emissiveIntensity: 1 
        });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.rotation.y = Math.PI / 2;
        body.add(gem);

        // Glass Wings
        const wingGeo = new THREE.PlaneGeometry(0.8, 0.6);
        const leftWing = new THREE.Mesh(wingGeo, this.mats.glass);
        leftWing.position.set(0, 0.3, -0.4);
        leftWing.rotation.x = -Math.PI / 2;
        leftWing.rotation.z = -Math.PI / 6;
        beeGroup.add(leftWing);

        const rightWing = leftWing.clone();
        rightWing.position.set(0, 0.3, 0.4);
        rightWing.rotation.z = Math.PI / 6;
        beeGroup.add(rightWing);

        beeGroup.userData = { lw: leftWing, rw: rightWing, time: Math.random() * 10, isBee: true };
        this.scene.add(beeGroup);
        return beeGroup;
    }

    createNectar3D(value) {
        const nectGeo = new THREE.OctahedronGeometry(0.4, 0);
        let color = 0xf0d58e; // Liquid Gold
        if(value === 4) color = 0xff33aa; // Ruby
        if(value === 1) color = 0x555555; // Platinum
        
        const nectMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: 1.0, 
            roughness: 0,
            emissive: color,
            emissiveIntensity: 0.5
        });
        const mesh = new THREE.Mesh(nectGeo, nectMat);
        this.scene.add(mesh);
        return mesh;
    }

    onPointerMove(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.boardSurface.children, true);
        
        // Reset all
        this.boardSurface.traverse(obj => {
            if(obj.userData && obj.userData.q !== undefined && obj.material.emissive) {
                obj.material.emissive.set(0x000000);
            }
        });

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if(hit.material && hit.material.emissive) hit.material.emissive.set(0x111111);
        }
    }

    onClick(event) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const beeIntersects = this.raycaster.intersectObjects(this.scene.children, true);
        const bee = beeIntersects.find(i => i.object.parent && i.object.parent.userData.isBee);
        if (bee) {
            if (this.onClickCallback) this.onClickCallback({ type: 'bee', mesh: bee.object.parent });
            return;
        }

        const hexIntersects = this.raycaster.intersectObjects(this.boardSurface.children, true);
        if (hexIntersects.length > 0) {
            const hex = hexIntersects.find(i => i.object.parent && i.object.parent.userData.q !== undefined);
            if (hex && this.onClickCallback) {
                this.onClickCallback({ 
                    type: 'hex', 
                    q: hex.object.parent.userData.q, 
                    r: hex.object.parent.userData.r 
                });
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        this.controls.update();

        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.lw) {
                const wingRot = Math.sin(time * 0.01 + obj.userData.time) * 0.4;
                obj.userData.lw.rotation.z = -Math.PI / 6 + wingRot;
                obj.userData.rw.rotation.z = Math.PI / 6 - wingRot;
                obj.position.y += Math.sin(time * 0.003 + obj.userData.time) * 0.005;
            }
        });

        this.composer.render();
    }
}
