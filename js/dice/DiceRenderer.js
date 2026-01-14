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

        // Camera - OrthographicCamera 사용으로 트레이가 항상 완전히 보임
        this.traySize = 6; // 트레이 뷰 영역 (약간의 여백 포함)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = this.createOrthographicCamera(aspect);
        this.camera.position.set(0, 15, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            preserveDrawingBuffer: true // 캔버스 캡처를 위해 필요
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
        this.handleResize = this.onResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * OrthographicCamera 생성 - 화면 비율에 맞춰 트레이가 항상 완전히 보이도록 설정
     */
    createOrthographicCamera(aspect) {
        let left, right, top, bottom;

        if (aspect >= 1) {
            // 가로 화면 (데스크톱) - 높이 기준으로 맞춤
            left = -this.traySize * aspect;
            right = this.traySize * aspect;
            top = this.traySize;
            bottom = -this.traySize;
        } else {
            // 세로 화면 (모바일) - 너비 기준으로 맞춤
            left = -this.traySize;
            right = this.traySize;
            top = this.traySize / aspect;
            bottom = -this.traySize / aspect;
        }

        return new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 100);
    }

    /**
     * 화면 비율에 따라 카메라 frustum 조정
     */
    adjustCameraForAspect(aspect) {
        if (aspect >= 1) {
            // 가로 화면 (데스크톱)
            this.camera.left = -this.traySize * aspect;
            this.camera.right = this.traySize * aspect;
            this.camera.top = this.traySize;
            this.camera.bottom = -this.traySize;
        } else {
            // 세로 화면 (모바일)
            this.camera.left = -this.traySize;
            this.camera.right = this.traySize;
            this.camera.top = this.traySize / aspect;
            this.camera.bottom = -this.traySize / aspect;
        }
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

        this.wallMeshes = []; // 테마 변경을 위해 저장

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
            this.wallMeshes.push(wall);
        });
    }

    /**
     * 트레이 테마 변경
     * @param {'default'|'wood'} themeName 
     */
    setTheme(themeName) {
        const themes = {
            default: {
                floorColor: 0x2c3e50,
                wallColor: 0x34495e,
                roughness: 0.8,
                metalness: 0.2
            },
            wood: {
                floorColor: 0x5d4037, // 갈색
                wallColor: 0x4e342e,  // 더 진한 갈색
                roughness: 0.6,
                metalness: 0.1
            }
        };

        const theme = themes[themeName] || themes.default;

        // 바닥 재질 업데이트
        if (this.trayMesh) {
            this.trayMesh.material.color.setHex(theme.floorColor);
            this.trayMesh.material.roughness = theme.roughness;
            this.trayMesh.material.metalness = theme.metalness;
        }

        // 벽 재질 업데이트
        if (this.wallMeshes) {
            this.wallMeshes.forEach(wall => {
                wall.material.color.setHex(theme.wallColor);
                wall.material.roughness = theme.roughness;
                wall.material.metalness = theme.metalness;
            });
        }
    }

    /**
     * 주사위 메시 생성 (타입별)
     * @param {string} type - 주사위 타입 (d4, d6, d8, d12, d20)
     * @param {string} color - 주사위 색상 (hex)
     * @returns {THREE.Mesh}
     */
    createDiceMesh(type = 'd6', color = '#e74c3c') {
        const geometry = this.createDiceGeometry(type);
        const materials = this.createDiceMaterials(type, color);

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.diceType = type; // 타입 저장

        this.diceMeshes.push(mesh);
        this.scene.add(mesh);

        return mesh;
    }

    /**
     * 타입별 지오메트리 생성
     */
    createDiceGeometry(type) {
        const size = 1;
        let geometry;

        switch (type) {
            case 'd4':
                geometry = new THREE.TetrahedronGeometry(size * 0.8);
                break;
            case 'd8':
                geometry = new THREE.OctahedronGeometry(size * 0.7);
                geometry = this.fixGeometryGroups(geometry, 8); // 8개 면
                break;
            case 'd12':
                geometry = new THREE.DodecahedronGeometry(size * 0.6);
                break;
            case 'd20':
                geometry = new THREE.IcosahedronGeometry(size * 0.7);
                geometry = this.fixGeometryGroups(geometry, 20); // 20개 면
                break;
            case 'd6':
            default:
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
        }

        return geometry;
    }

    /**
     * 다면체 지오메트리에 머티리얼 인덱스 그룹 할당 및 UV 수정
     */
    fixGeometryGroups(geometry, faceCount) {
        const nonIndexed = geometry.toNonIndexed();

        const positionAttribute = nonIndexed.attributes.position;
        const uvAttribute = nonIndexed.attributes.uv;
        const vertexCount = positionAttribute.count;
        const verticesPerFace = vertexCount / faceCount;

        nonIndexed.clearGroups();

        // 텍스처 매핑을 위한 UV 좌표 (삼각형 중앙에 숫자가 오도록)
        // 텍스처 중심(0.5, 0.5)을 기준으로 삼각형 UV 배치
        // 상단(0.5, 0.9), 좌하단(0.15, 0.2), 우하단(0.85, 0.2)
        const uvs = [
            new THREE.Vector2(0.5, 0.9),  // 상단
            new THREE.Vector2(0.15, 0.2), // 좌하단
            new THREE.Vector2(0.85, 0.2)  // 우하단
        ];

        for (let i = 0; i < faceCount; i++) {
            nonIndexed.addGroup(i * verticesPerFace, verticesPerFace, i);

            // 각 면의 버텍스마다 UV 할당
            for (let j = 0; j < verticesPerFace; j++) {
                // 단순화된 매핑: 정점 순서대로 할당 ( j % 3 )
                const uv = uvs[j % 3];
                // uvAttribute가 없을 경우 생성해야 할 수도 있으나 toNonIndexed는 보통 UV를 포함함
                if (uvAttribute) {
                    uvAttribute.setXY(i * verticesPerFace + j, uv.x, uv.y);
                }
            }
        }

        return nonIndexed;
    }

    /**
     * 색상이 밝은지 판단 (눈금 색상 결정용)
     */
    isLightColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        // 밝기 계산 (YIQ 공식)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 150;
    }

    /**
     * 타입별 머티리얼 생성
     */
    createDiceMaterials(type, baseColor) {
        switch (type) {
            case 'd6':
                return this.createD6Materials(baseColor);
            case 'd8':
                return this.createD8Materials(baseColor);
            case 'd20':
                return this.createD20Materials(baseColor);
            default:
                return this.createPolyMaterial(baseColor);
        }
    }

    /**
     * D6용 머티리얼 (각 면별 눈금)
     */
    createD6Materials(baseColor) {
        const faceValues = [2, 5, 3, 4, 1, 6]; // Three.js face order: +X, -X, +Y, -Y, +Z, -Z
        const dotColor = this.isLightColor(baseColor) ? '#222222' : '#ffffff';

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
            ctx.fillStyle = dotColor;
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
     * D8용 머티리얼 (각 면별 숫자)
     */
    createD8Materials(baseColor) {
        const textColor = this.isLightColor(baseColor) ? '#222222' : '#ffffff';

        // D8: 8개 면에 1-8 숫자
        const materials = [];
        for (let i = 1; i <= 8; i++) {
            materials.push(this.createNumberMaterial(baseColor, textColor, i));
        }
        return materials;
    }

    /**
     * D20용 머티리얼 (표준 D20 면 배치)
     */
    createD20Materials(baseColor) {
        const textColor = this.isLightColor(baseColor) ? '#222222' : '#ffffff';

        // 표준 D20 면 값 (근사치)
        const faceValues = [
            1, 20, 2, 19, 3, 18, 4, 17, 5, 16,
            6, 15, 7, 14, 8, 13, 9, 12, 10, 11
        ];

        return faceValues.map(value => this.createNumberMaterial(baseColor, textColor, value));
    }

    /**
     * 숫자가 있는 머티리얼 생성
     */
    createNumberMaterial(baseColor, textColor, number) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 배경색 (전체 채우기)
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 128, 128);

        // 테두리 (선택 사항)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 124, 124);

        // 숫자
        ctx.fillStyle = textColor;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.center.set(0.5, 0.5); // 텍스처 중심점 설정
        texture.anisotropy = 4;

        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.3,
            metalness: 0.1,
            flatShading: true
        });
    }

    /**
     * 다면체용 단일 머티리얼 (숫자 없이 깔끔하게)
     */
    createPolyMaterial(baseColor) {
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.3,
            metalness: 0.2,
            flatShading: true
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
        const aspect = width / height;

        this.adjustCameraForAspect(aspect);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.render(); // 루프가 멈춘 상태에서도 리사이즈 시 화면 다시 그리기
    }

    dispose() {
        this.clearDice();
        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize);
    }
}
