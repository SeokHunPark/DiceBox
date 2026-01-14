import * as CANNON from 'cannon-es';

/**
 * DicePhysics - Cannon-es 기반 물리 시뮬레이션
 */
export class DicePhysics {
    constructor() {
        this.world = null;
        this.diceBodies = [];
        this.floorBody = null;
        this.wallBodies = [];

        /** @type {Function|null} 충돌 콜백 함수 */
        this.onCollision = null;

        // D6 면의 로컬 법선 벡터와 눈금 매핑
        // Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
        this.faceNormals = [
            { face: 2, normal: new CANNON.Vec3(1, 0, 0) },   // +X
            { face: 5, normal: new CANNON.Vec3(-1, 0, 0) },  // -X  
            { face: 3, normal: new CANNON.Vec3(0, 1, 0) },   // +Y
            { face: 4, normal: new CANNON.Vec3(0, -1, 0) },  // -Y
            { face: 1, normal: new CANNON.Vec3(0, 0, 1) },   // +Z
            { face: 6, normal: new CANNON.Vec3(0, 0, -1) }   // -Z
        ];

        this.init();
    }

    init() {
        // World 생성
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.allowSleep = true;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.3;

        // Broadphase
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        // 충돌 이벤트 리스너
        this.world.addEventListener('collide', (event) => this.handleCollision(event));

        // 트레이(바닥 + 벽) 생성
        this.createTray();
    }

    /**
     * 충돌 콜백 함수 설정
     * @param {Function} callback - (type: 'dice'|'floor'|'wall', velocity: number, x: number) => void
     */
    setOnCollision(callback) {
        this.onCollision = callback;
    }

    /**
     * 충돌 이벤트 처리
     */
    handleCollision(event) {
        if (!this.onCollision) return;

        const { bodyA, bodyB, contact } = event;

        // 충돌 속도 계산
        const velocity = contact.getImpactVelocityAlongNormal();
        const absVelocity = Math.abs(velocity);

        // 충돌 위치 (X 좌표, 스테레오 패닝용)
        const contactPoint = contact.bi.position;
        const x = contactPoint.x;

        // 충돌 유형 판별
        let collisionType = null;

        const isDiceA = this.diceBodies.includes(bodyA);
        const isDiceB = this.diceBodies.includes(bodyB);
        const isFloorA = bodyA === this.floorBody;
        const isFloorB = bodyB === this.floorBody;
        const isWallA = this.wallBodies.includes(bodyA);
        const isWallB = this.wallBodies.includes(bodyB);

        if (isDiceA && isDiceB) {
            collisionType = 'dice';
        } else if ((isDiceA || isDiceB) && (isFloorA || isFloorB)) {
            collisionType = 'floor';
        } else if ((isDiceA || isDiceB) && (isWallA || isWallB)) {
            collisionType = 'wall';
        }

        if (collisionType) {
            this.onCollision(collisionType, absVelocity, x);
        }
    }

    createTray() {
        // 바닥
        const floorShape = new CANNON.Box(new CANNON.Vec3(5, 0.25, 5));
        this.floorBody = new CANNON.Body({
            mass: 0,
            shape: floorShape,
            position: new CANNON.Vec3(0, -0.25, 0)
        });
        this.world.addBody(this.floorBody);

        // 벽 (높이를 5로 증가하여 주사위가 밖으로 튀어나가지 않도록 함)
        // 렌더링 벽은 낮게 유지되므로 시각적으로는 보이지 않는 투명 벽 역할
        const wallHeight = 5;
        const wallConfigs = [
            { pos: new CANNON.Vec3(0, wallHeight / 2, -5), size: new CANNON.Vec3(5, wallHeight / 2, 0.25) },
            { pos: new CANNON.Vec3(0, wallHeight / 2, 5), size: new CANNON.Vec3(5, wallHeight / 2, 0.25) },
            { pos: new CANNON.Vec3(-5, wallHeight / 2, 0), size: new CANNON.Vec3(0.25, wallHeight / 2, 5) },
            { pos: new CANNON.Vec3(5, wallHeight / 2, 0), size: new CANNON.Vec3(0.25, wallHeight / 2, 5) }
        ];

        wallConfigs.forEach(({ pos, size }) => {
            const wallShape = new CANNON.Box(size);
            const wallBody = new CANNON.Body({
                mass: 0,
                shape: wallShape,
                position: pos
            });
            this.world.addBody(wallBody);
            this.wallBodies.push(wallBody);
        });
    }

    /**
     * 주사위 물리 바디 생성
     * @param {string} type - 주사위 타입 (d4, d6, d8, d12, d20)
     * @returns {CANNON.Body}
     */
    createDiceBody(type = 'd6') {
        const shape = this.createDiceShape(type);

        const body = new CANNON.Body({
            mass: 1,
            shape: shape,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1
        });

        // 타입 저장 (결과 판정용)
        body.diceType = type;

        // 랜덤 초기 위치 (트레이 위 공중)
        body.position.set(
            (Math.random() - 0.5) * 4,
            5 + Math.random() * 3,
            (Math.random() - 0.5) * 4
        );

        // 랜덤 초기 회전
        body.quaternion.setFromEuler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        // 충돌 이벤트 리스너 등록
        body.addEventListener('collide', (event) => this.handleCollision(event));

        this.world.addBody(body);
        this.diceBodies.push(body);

        return body;
    }

    /**
     * 타입별 충돌 모양 생성
     */
    createDiceShape(type) {
        const scale = 0.5;
        switch (type) {
            case 'd4':
                return this.createTetrahedronShape(scale);
            case 'd8':
                return this.createOctahedronShape(scale);
            case 'd12':
                // D12: 정팔면체를 약간 크게 사용 (정십이면체 ConvexPolyhedron 불안정)
                return this.createOctahedronShape(scale * 0.9);
            case 'd20':
                return this.createIcosahedronShape(scale);
            case 'd6':
            default:
                return new CANNON.Box(new CANNON.Vec3(scale, scale, scale));
        }
    }

    /**
     * 정사면체 (D4) 충돌체 생성 - 올바른 면 순서
     */
    createTetrahedronShape(scale) {
        const a = scale * 1.2;
        // 정사면체 정점 (정규화된 좌표)
        const vertices = [
            new CANNON.Vec3(a, a, a),      // 0
            new CANNON.Vec3(a, -a, -a),    // 1
            new CANNON.Vec3(-a, a, -a),    // 2
            new CANNON.Vec3(-a, -a, a)     // 3
        ];
        // 면 정의: 반시계 방향 (외부에서 볼 때)
        const faces = [
            [0, 2, 1],  // 위쪽 면
            [0, 1, 3],  // 오른쪽 면
            [0, 3, 2],  // 왼쪽 면
            [1, 2, 3]   // 바닥 면
        ];
        return new CANNON.ConvexPolyhedron({ vertices, faces });
    }

    /**
     * 정팔면체 (D8) 충돌체 생성 - Three.js OctahedronGeometry와 일치
     */
    createOctahedronShape(scale) {
        const s = scale * 1.2;
        // Three.js OctahedronGeometry vertices
        const vertices = [
            new CANNON.Vec3(s, 0, 0),    // 0
            new CANNON.Vec3(-s, 0, 0),   // 1
            new CANNON.Vec3(0, s, 0),    // 2
            new CANNON.Vec3(0, -s, 0),   // 3
            new CANNON.Vec3(0, 0, s),    // 4
            new CANNON.Vec3(0, 0, -s)    // 5
        ];
        // Three.js indices
        const faces = [
            [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
            [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]
        ];
        return new CANNON.ConvexPolyhedron({ vertices, faces });
    }

    /**
     * 정십이면체 (D12) 충돌체 생성
     */
    createDodecahedronShape(scale) {
        // D12: 정팔면체를 약간 크게 사용 (정십이면체 ConvexPolyhedron 불안정)
        return this.createOctahedronShape(scale * 0.9);
    }

    /**
     * 정이십면체 (D20) 충돌체 생성 - Three.js IcosahedronGeometry와 일치
     */
    createIcosahedronShape(scale) {
        const t = (1 + Math.sqrt(5)) / 2;
        const s = scale * 0.8;

        // Three.js IcosahedronGeometry vertices (scaled)
        const vertices = [
            new CANNON.Vec3(-s, s * t, 0), new CANNON.Vec3(s, s * t, 0), new CANNON.Vec3(-s, -s * t, 0), new CANNON.Vec3(s, -s * t, 0),
            new CANNON.Vec3(0, -s, s * t), new CANNON.Vec3(0, s, s * t), new CANNON.Vec3(0, -s, -s * t), new CANNON.Vec3(0, s, -s * t),
            new CANNON.Vec3(s * t, 0, -s), new CANNON.Vec3(s * t, 0, s), new CANNON.Vec3(-s * t, 0, -s), new CANNON.Vec3(-s * t, 0, s)
        ];

        // Three.js indices
        const faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        return new CANNON.ConvexPolyhedron({ vertices, faces });
    }

    /**
     * 주사위에 던지기 힘 적용
     */
    throwDice(body) {
        // 랜덤 던지기 힘
        const forceMagnitude = 15 + Math.random() * 10;
        const force = new CANNON.Vec3(
            (Math.random() - 0.5) * forceMagnitude,
            -forceMagnitude * 0.5,
            (Math.random() - 0.5) * forceMagnitude
        );

        // 랜덤 토크 (회전력)
        const torque = new CANNON.Vec3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );

        body.applyImpulse(force, body.position);
        body.angularVelocity.copy(torque);
    }

    /**
     * 물리 시뮬레이션 스텝
     * @param {number} deltaTime
     */
    step(deltaTime = 1 / 60) {
        this.world.step(deltaTime);

        // 충돌 감지 및 콜백 호출
        this.checkCollisions();
    }

    /**
     * 현재 프레임의 충돌 확인 및 사운드 콜백 호출
     */
    checkCollisions() {
        if (!this.onCollision) return;

        // world.contacts에서 충돌 정보 확인
        for (const contact of this.world.contacts) {
            const bodyA = contact.bi;
            const bodyB = contact.bj;

            // 충돌 속도 계산
            const relativeVelocity = new CANNON.Vec3();
            bodyA.velocity.vsub(bodyB.velocity, relativeVelocity);
            const velocity = relativeVelocity.length();

            // 너무 작은 충돌은 무시
            if (velocity < 1) continue;

            // 충돌 위치 (X 좌표, 스테레오 패닝용)
            const x = (bodyA.position.x + bodyB.position.x) / 2;

            // 충돌 유형 판별
            const isDiceA = this.diceBodies.includes(bodyA);
            const isDiceB = this.diceBodies.includes(bodyB);
            const isFloorA = bodyA === this.floorBody;
            const isFloorB = bodyB === this.floorBody;
            const isWallA = this.wallBodies.includes(bodyA);
            const isWallB = this.wallBodies.includes(bodyB);

            let collisionType = null;
            if (isDiceA && isDiceB) {
                collisionType = 'dice';
            } else if ((isDiceA || isDiceB) && (isFloorA || isFloorB)) {
                collisionType = 'floor';
            } else if ((isDiceA || isDiceB) && (isWallA || isWallB)) {
                collisionType = 'wall';
            }

            if (collisionType) {
                this.onCollision(collisionType, velocity, x);
            }
        }
    }

    /**
     * 주사위가 트레이 범위 밖에 있는지 확인
     * @param {CANNON.Body} body
     * @returns {boolean}
     */
    isOutOfBounds(body) {
        const pos = body.position;
        return pos.y < -5 || Math.abs(pos.x) > 7 || Math.abs(pos.z) > 7;
    }

    /**
     * 범위 밖 주사위를 트레이 안으로 리셋
     */
    resetOutOfBoundsDice() {
        this.diceBodies.forEach(body => {
            if (this.isOutOfBounds(body)) {
                // 트레이 중앙 위로 리셋
                body.position.set(
                    (Math.random() - 0.5) * 2,
                    3 + Math.random() * 2,
                    (Math.random() - 0.5) * 2
                );
                body.velocity.set(0, -5, 0);
                body.angularVelocity.set(
                    Math.random() * 5,
                    Math.random() * 5,
                    Math.random() * 5
                );
                body.wakeUp();
            }
        });
    }

    /**
     * 모든 주사위가 정지했는지 확인
     * @returns {boolean}
     */
    allDiceStopped() {
        // 범위 밖 주사위가 있으면 리셋
        this.resetOutOfBoundsDice();

        // 모든 주사위가 정지 상태인지 확인 (sleep 또는 속도 기반)
        return this.diceBodies.every(body => {
            // 이미 sleep 상태면 정지로 판단
            if (body.sleepState === CANNON.Body.SLEEPING) {
                return true;
            }

            // 속도가 매우 낮으면 정지로 판단 (ConvexPolyhedron이 sleep에 잘 안 들어갈 수 있음)
            const velocity = body.velocity.length();
            const angularVelocity = body.angularVelocity.length();

            if (velocity < 0.1 && angularVelocity < 0.1) {
                // 강제로 sleep 상태로 설정
                body.sleep();
                return true;
            }

            return false;
        });
    }

    /**
     * 주사위의 결과값 계산
     * @param {CANNON.Body} body
     * @returns {number} 주사위 눈금
     */
    /**
     * 주사위의 결과값 계산
     * @param {CANNON.Body} body
     * @returns {number} 주사위 눈금
     */
    getDiceValue(body) {
        const type = body.diceType || 'd6';

        // D6는 기존 로직 (Box 충돌체는 법선이 축 정렬됨)
        if (type === 'd6') {
            return this.getD6Value(body);
        }

        // D8, D20 등 다면체는 ConvexPolyhedron의 법선을 이용해 판정
        if (body.shapes[0] && body.shapes[0] instanceof CANNON.ConvexPolyhedron) {
            return this.getPolyhedronValue(body, type);
        }

        // 예외 처리 (랜덤)
        return this.getRandomDiceValue(type);
    }

    /**
     * 다면체 주사위 눈금 계산
     */
    getPolyhedronValue(body, type) {
        const shape = body.shapes[0];
        const faces = shape.faces;
        const vertices = shape.vertices;
        const upVector = new CANNON.Vec3(0, 1, 0);

        let maxDot = -Infinity;
        let bestFaceIndex = -1;

        // 각 면의 법선 벡터를 계산하고 위쪽(0,1,0)과 가장 가까운 면을 찾음
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            // 면의 세 점 가져오기 (ConvexPolyhedron은 삼각형 이상의 다각형일 수 있음)
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];

            // 법선 계산: (v1-v0) x (v2-v0)
            const e1 = new CANNON.Vec3();
            const e2 = new CANNON.Vec3();
            const normal = new CANNON.Vec3();

            v1.vsub(v0, e1);
            v2.vsub(v0, e2);
            e1.cross(e2, normal);
            normal.normalize();

            // 로컬 법선을 월드로 변환
            const worldNormal = body.quaternion.vmult(normal);
            const dot = worldNormal.dot(upVector);

            if (dot > maxDot) {
                maxDot = dot;
                bestFaceIndex = i;
            }
        }

        // 찾은 면 인덱스를 결과 값으로 매핑
        return this.mapFaceIndexToValue(type, bestFaceIndex);
    }

    /**
     * 면 인덱스를 주사위 눈금으로 변환
     */
    mapFaceIndexToValue(type, faceIndex) {
        if (type === 'd20') {
            // DiceRenderer.js의 createD20Materials에 정의된 faceValues 배열과 동일해야 함
            const d20Map = [1, 20, 2, 19, 3, 18, 4, 17, 5, 16, 6, 15, 7, 14, 8, 13, 9, 12, 10, 11];
            if (faceIndex >= 0 && faceIndex < d20Map.length) {
                return d20Map[faceIndex];
            }
        }

        // D8은 순차적으로 1~8 할당함
        return faceIndex + 1;
    }

    /**
     * D6 윗면 눈금 계산 (법선 벡터 기반)
     */
    getD6Value(body) {
        const upVector = new CANNON.Vec3(0, 1, 0);
        let maxDot = -Infinity;
        let topFace = 1;

        this.faceNormals.forEach(({ face, normal }) => {
            // 로컬 법선을 월드 좌표로 변환
            const worldNormal = body.quaternion.vmult(normal);
            const dot = worldNormal.dot(upVector);

            if (dot > maxDot) {
                maxDot = dot;
                topFace = face;
            }
        });

        return topFace;
    }

    /**
     * 타입별 랜덤 결과값 생성
     */
    getRandomDiceValue(type) {
        const maxValues = {
            'd4': 4,
            'd6': 6,
            'd8': 8,
            'd12': 12,
            'd20': 20
        };
        const max = maxValues[type] || 6;
        return Math.floor(Math.random() * max) + 1;
    }

    /**
     * 모든 주사위의 결과 반환
     * @returns {number[]}
     */
    getAllResults() {
        return this.diceBodies.map(body => this.getDiceValue(body));
    }

    /**
     * 모든 주사위 제거
     */
    clearDice() {
        this.diceBodies.forEach(body => {
            this.world.removeBody(body);
        });
        this.diceBodies = [];
    }

    dispose() {
        this.clearDice();
        this.wallBodies.forEach(body => this.world.removeBody(body));
        this.world.removeBody(this.floorBody);
    }
}
