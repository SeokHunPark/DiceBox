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
     * @returns {CANNON.Body}
     */
    createDiceBody() {
        const size = 0.5; // 반지름 (Three.js의 1 사이즈와 매칭)
        const shape = new CANNON.Box(new CANNON.Vec3(size, size, size));

        const body = new CANNON.Body({
            mass: 1,
            shape: shape,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1
        });

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

        this.world.addBody(body);
        this.diceBodies.push(body);

        return body;
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
        return this.diceBodies.every(body => body.sleepState === CANNON.Body.SLEEPING);
    }

    /**
     * 주사위의 윗면 눈금 계산 (법선 벡터 기반)
     * @param {CANNON.Body} body
     * @returns {number} 1-6 눈금
     */
    getDiceValue(body) {
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
