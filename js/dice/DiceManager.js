import { DiceRenderer } from './DiceRenderer.js';
import { DicePhysics } from './DicePhysics.js';
import { soundManager } from '../audio/SoundManager.js';

/**
 * DiceManager - 렌더러와 물리 엔진 통합 관리
 */
export class DiceManager {
    constructor(canvas) {
        this.renderer = new DiceRenderer(canvas);
        this.physics = new DicePhysics();
        this.diceData = []; // { mesh, body } 쌍
        this.isRolling = false;
        this.animationId = null;
        this.onRollComplete = null;
        this.diceColor = '#e74c3c';
        this.diceType = 'd6'; // 주사위 타입 (d4, d6, d8, d12, d20)

        // 물리 충돌 → 사운드 재생 연결
        this.physics.setOnCollision((type, velocity, x) => {
            soundManager.playCollision(type, velocity, x);
        });
    }

    /**
     * 주사위 색상 설정
     */
    setDiceColor(color) {
        this.diceColor = color;
    }

    /**
     * 주사위 타입 설정
     */
    setDiceType(type) {
        this.diceType = type;
    }

    /**
     * 주사위 던지기 시작
     * @param {number} count - 주사위 개수
     * @returns {Promise<number[]>} 결과 배열
     */
    roll(count) {
        return new Promise((resolve) => {
            // 기존 주사위 제거
            this.clear();
            this.isRolling = true;
            this.rollStartTime = Date.now();
            this.maxRollTime = 10000; // 10초 타임아웃

            // 주사위 생성 (타입 전달)
            for (let i = 0; i < count; i++) {
                const mesh = this.renderer.createDiceMesh(this.diceType, this.diceColor);
                const body = this.physics.createDiceBody(this.diceType);

                // 초기 위치 동기화
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);

                // 던지기 힘 적용
                this.physics.throwDice(body);

                this.diceData.push({ mesh, body, type: this.diceType });
            }

            // 애니메이션 루프 시작
            this.onRollComplete = resolve;
            this.animate();
        });
    }

    /**
     * 애니메이션 루프
     */
    animate() {
        if (!this.isRolling) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // 물리 시뮬레이션 업데이트
        this.physics.step();

        // 메시 위치 동기화
        this.diceData.forEach(({ mesh, body }) => {
            this.renderer.updateDiceMesh(mesh, body.position, body.quaternion);
        });

        // 렌더링
        this.renderer.render();

        // 타임아웃 체크 (10초 초과 시 강제 종료)
        const elapsed = Date.now() - this.rollStartTime;
        if (elapsed > this.maxRollTime) {
            console.warn('Roll timeout - forcing result');
            this.stopRolling();
            return;
        }

        // 모든 주사위가 정지했는지 확인
        if (this.physics.allDiceStopped()) {
            this.stopRolling();
        }
    }

    /**
     * 굴리기 중지 및 결과 반환
     */
    stopRolling() {
        if (!this.isRolling) return; // 이미 중지된 경우 무시
        this.isRolling = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // 결과 계산
        const results = this.physics.getAllResults();

        if (this.onRollComplete) {
            const callback = this.onRollComplete;
            this.onRollComplete = null; // 중복 호출 방지

            // 약간의 딜레이 후 결과 반환 (시각적 안정화)
            setTimeout(() => {
                callback(results);
            }, 500);
        }
    }

    /**
     * 주사위 제거
     */
    clear() {
        this.isRolling = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.renderer.clearDice();
        this.physics.clearDice();
        this.diceData = [];
    }

    /**
     * 리소스 해제
     */
    dispose() {
        this.clear();
        this.renderer.dispose();
        this.physics.dispose();
    }
}
