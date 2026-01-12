import * as THREE from 'three';

/**
 * DiceRenderer - Three.js 기반 3D 렌더링
 */
export class DiceRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.diceMeshes = [];
        this.trayMesh = null;

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.set(0, 12, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        this.setupLights();

        // Tray (Floor)
        this.createTray();

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xe94560, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    createTray() {
        // Tray floor
        const floorGeometry = new THREE.BoxGeometry(10, 0.5, 10);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.8,
            metalness: 0.2
        });
        this.trayMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.trayMesh.position.y = -0.25;
        this.trayMesh.receiveShadow = true;
        this.scene.add(this.trayMesh);

        // Tray walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x34495e,
            roughness: 0.7,
            metalness: 0.3
        });

        const wallPositions = [
            { pos: [0, 0.5, -5], size: [10, 1.5, 0.5] },
            { pos: [0, 0.5, 5], size: [10, 1.5, 0.5] },
            { pos: [-5, 0.5, 0], size: [0.5, 1.5, 10] },
            { pos: [5, 0.5, 0], size: [0.5, 1.5, 10] }
        ];

        wallPositions.forEach(({ pos, size }) => {
            const wallGeometry = new THREE.BoxGeometry(...size);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(...pos);
            wall.receiveShadow = true;
            wall.castShadow = true;
            this.scene.add(wall);
        });
    }

    /**
     * D6 주사위 메시 생성
     * @param {string} color - 주사위 색상 (hex)
     * @returns {THREE.Mesh}
     */
    createDiceMesh(color = '#e74c3c') {
        const size = 1;
        const geometry = new THREE.BoxGeometry(size, size, size);

        // 각 면에 다른 텍스처 적용을 위한 머티리얼 배열
        const materials = this.createDiceMaterials(color);

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.diceMeshes.push(mesh);
        this.scene.add(mesh);

        return mesh;
    }

    /**
     * D6 각 면의 머티리얼 생성 (눈금 표시)
     */
    createDiceMaterials(baseColor) {
        const faceValues = [2, 5, 3, 4, 1, 6]; // Three.js face order: +X, -X, +Y, -Y, +Z, -Z

        return faceValues.map(value => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // 배경색
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, 128, 128);

            // 테두리
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 4;
            ctx.strokeRect(4, 4, 120, 120);

            // 눈금 그리기
            ctx.fillStyle = '#ffffff';
            this.drawDiceDots(ctx, value, 128);

            const texture = new THREE.CanvasTexture(canvas);
            texture.anisotropy = 4;

            return new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.4,
                metalness: 0.1
            });
        });
    }

    /**
     * 주사위 눈금 점 그리기
     */
    drawDiceDots(ctx, value, size) {
        const dotRadius = size * 0.1;
        const positions = this.getDotPositions(value, size);

        positions.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * 눈금 값에 따른 점 위치 반환
     */
    getDotPositions(value, size) {
        const center = size / 2;
        const offset = size * 0.28;

        const patterns = {
            1: [[center, center]],
            2: [[center - offset, center - offset], [center + offset, center + offset]],
            3: [[center - offset, center - offset], [center, center], [center + offset, center + offset]],
            4: [[center - offset, center - offset], [center + offset, center - offset],
            [center - offset, center + offset], [center + offset, center + offset]],
            5: [[center - offset, center - offset], [center + offset, center - offset],
            [center, center],
            [center - offset, center + offset], [center + offset, center + offset]],
            6: [[center - offset, center - offset], [center + offset, center - offset],
            [center - offset, center], [center + offset, center],
            [center - offset, center + offset], [center + offset, center + offset]]
        };

        return patterns[value] || [];
    }

    /**
     * 주사위 메시 위치/회전 업데이트 (물리 엔진과 동기화)
     */
    updateDiceMesh(mesh, position, quaternion) {
        mesh.position.copy(position);
        mesh.quaternion.copy(quaternion);
    }

    /**
     * 모든 주사위 제거
     */
    clearDice() {
        this.diceMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            }
        });
        this.diceMeshes = [];
    }

    /**
     * 렌더링 실행
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose() {
        this.clearDice();
        this.renderer.dispose();
        window.removeEventListener('resize', this.onResize);
    }
}
