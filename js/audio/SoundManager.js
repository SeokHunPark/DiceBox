/**
 * SoundManager - Web Audio API 기반 사운드 시스템
 * 외부 오디오 파일 없이 실시간으로 충돌음을 합성
 */
export class SoundManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.audioContext = null;

        /** @type {boolean} AudioContext 초기화 여부 */
        this.initialized = false;

        /** @type {number} 마지막 사운드 재생 시간 (쿨다운용) */
        this.lastSoundTime = 0;

        /** @type {number} 사운드 재생 쿨다운 (ms) */
        this.cooldown = 30;

        /** @type {boolean} 사운드 활성화 여부 */
        this.enabled = true;
    }

    /**
     * AudioContext 초기화 (사용자 인터랙션 후 호출 필요)
     */
    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 SoundManager initialized');
        } catch (error) {
            console.warn('AudioContext not supported:', error);
            this.enabled = false;
        }
    }

    /**
     * AudioContext 재개 (일시 중지 상태에서 활성화)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * 충돌음 재생
     * @param {'dice'|'floor'|'wall'} type - 충돌 유형
     * @param {number} velocity - 충돌 속도 (0-20 범위)
     * @param {number} x - X 좌표 (-5 ~ 5, 스테레오 패닝용)
     */
    playCollision(type, velocity, x = 0) {
        if (!this.enabled || !this.initialized || !this.audioContext) return;

        // 쿨다운 체크
        const now = performance.now();
        if (now - this.lastSoundTime < this.cooldown) return;
        this.lastSoundTime = now;

        // 속도 정규화 (0 ~ 1)
        const normalizedVelocity = Math.min(velocity / 15, 1);

        // 너무 작은 충돌은 무시
        if (normalizedVelocity < 0.1) return;

        // 충돌 유형별 사운드 생성
        switch (type) {
            case 'dice':
                this.playDiceHitSound(normalizedVelocity, x);
                break;
            case 'floor':
                this.playFloorHitSound(normalizedVelocity, x);
                break;
            case 'wall':
                this.playWallHitSound(normalizedVelocity, x);
                break;
        }
    }

    /**
     * 주사위-주사위 충돌음 (날카로운 클릭)
     */
    playDiceHitSound(velocity, x) {
        const duration = 0.03 + velocity * 0.02;
        const frequency = 2500 + velocity * 1500;

        this.createImpactSound({
            frequency,
            duration,
            volume: 0.15 * velocity,
            type: 'highpass',
            q: 5,
            x
        });
    }

    /**
     * 주사위-바닥 충돌음 (묵직한 저음)
     */
    playFloorHitSound(velocity, x) {
        const duration = 0.08 + velocity * 0.05;
        const frequency = 300 + velocity * 300;

        this.createImpactSound({
            frequency,
            duration,
            volume: 0.25 * velocity,
            type: 'lowpass',
            q: 2,
            x
        });
    }

    /**
     * 주사위-벽 충돌음 (중간 톤)
     */
    playWallHitSound(velocity, x) {
        const duration = 0.04 + velocity * 0.03;
        const frequency = 1000 + velocity * 500;

        this.createImpactSound({
            frequency,
            duration,
            volume: 0.12 * velocity,
            type: 'bandpass',
            q: 3,
            x
        });
    }

    /**
     * 임팩트 사운드 생성 (노이즈 + 필터)
     */
    createImpactSound({ frequency, duration, volume, type, q, x }) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 노이즈 버퍼 생성
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // 노이즈 소스
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // 필터
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;

        // 볼륨 엔벨로프
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // 스테레오 패닝
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, x / 5));

        // 연결
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);

        // 재생
        noise.start(now);
        noise.stop(now + duration);
    }

    /**
     * 사운드 활성화/비활성화
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 리소스 해제
     */
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.initialized = false;
    }
}

// 싱글톤 인스턴스
export const soundManager = new SoundManager();
