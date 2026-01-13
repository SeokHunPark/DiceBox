/**
 * SoundManager - Web Audio API 기반 사운드 시스템
 * 외부 오디오 파일 없이 실시간으로 충돌음을 합성
 * 재질(Material) 시스템 및 피치 랜덤화 적용
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

        /**
         * 재질 정의
         * frequencyBase: 기본 주파수
         * frequencyMod: 속도에 따른 주파수 변화량
         * decayBase: 기본 감쇠 시간
         * decayMod: 속도에 따른 감쇠 시간 변화량
         * type: 필터 타입
         * q: 필터 Q값
         */
        this.materials = {
            // 기본 (펠트 느낌) - 부드럽고 낮은 소리
            default: {
                floor: { freqBase: 250, freqMod: 200, decayBase: 0.1, decayMod: 0.05, type: 'lowpass', q: 2 },
                wall: { freqBase: 800, freqMod: 400, decayBase: 0.05, decayMod: 0.03, type: 'bandpass', q: 3 }
            },
            // 나무 (단단하고 울림이 있음) - 더 높고 짧고 날카로운 소리
            wood: {
                floor: { freqBase: 600, freqMod: 500, decayBase: 0.06, decayMod: 0.03, type: 'bandpass', q: 5 },
                wall: { freqBase: 1500, freqMod: 800, decayBase: 0.03, decayMod: 0.02, type: 'highpass', q: 5 }
            },
            // 유리/금속 (테스트용)
            // hard: { ... }
        };

        /** @type {string} 현재 재질 ID */
        this.currentMaterial = 'default';
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
     * 재질 변경
     * @param {string} materialName 
     */
    setMaterial(materialName) {
        if (this.materials[materialName]) {
            this.currentMaterial = materialName;
            console.log(`🔊 Material changed to: ${materialName}`);
        } else {
            console.warn(`🔊 Material not found: ${materialName}`);
        }
    }

    /**
     * 충돌음 재생
     * @param {'dice'|'floor'|'wall'} type - 충돌 유형
     * @param {number} velocity - 충돌 속도 (0-20 범위)
     * @param {number} x - X 좌표 (-5 ~ 5, 스테레오 패닝용)
     */
    playCollision(type, velocity, x = 0) {
        // 속도 임계값 상향 조정 (너무 작은 충돌음 제거하여 소음 감소)
        if (!this.enabled || !this.initialized || !this.audioContext || velocity < 1.0) return;

        // 쿨다운 체크
        const now = performance.now();
        if (now - this.lastSoundTime < this.cooldown) return;
        this.lastSoundTime = now;

        // 속도 정규화 (0 ~ 1) - 최대 속도 기준을 20으로 설정
        const normalizedVelocity = Math.min(velocity / 20, 1);

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
     * 무작위 피치 변조 (Pitch Randomization)
     * @returns {number} 0.9 ~ 1.1 범위의 배수
     */
    getRandomPitch() {
        return 0.9 + Math.random() * 0.2;
    }

    /**
     * 주사위-주사위 충돌음 (날카로운 클릭, 재질 무관 고정)
     */
    playDiceHitSound(velocity, x) {
        const pitchMod = this.getRandomPitch();

        // 속도가 빠를수록 더 높고 짧은 소리
        const duration = (0.03 + velocity * 0.02);
        const frequency = (2500 + velocity * 1500) * pitchMod;

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
     * 주사위-바닥 충돌음 (재질 속성 적용)
     */
    playFloorHitSound(velocity, x) {
        const mat = this.materials[this.currentMaterial].floor;
        const pitchMod = this.getRandomPitch();

        const duration = mat.decayBase + velocity * mat.decayMod;
        const frequency = (mat.freqBase + velocity * mat.freqMod) * pitchMod;

        this.createImpactSound({
            frequency,
            duration,
            volume: 0.3 * velocity, // 바닥 소리는 조금 더 크게
            type: mat.type,
            q: mat.q,
            x
        });
    }

    /**
     * 주사위-벽 충돌음 (재질 속성 적용)
     */
    playWallHitSound(velocity, x) {
        const mat = this.materials[this.currentMaterial].wall;
        const pitchMod = this.getRandomPitch();

        const duration = mat.decayBase + velocity * mat.decayMod;
        const frequency = (mat.freqBase + velocity * mat.freqMod) * pitchMod;

        this.createImpactSound({
            frequency,
            duration,
            volume: 0.15 * velocity,
            type: mat.type,
            q: mat.q,
            x
        });
    }

    /**
     * 임팩트 사운드 생성 (노이즈 + 필터)
     */
    createImpactSound({ frequency, duration, volume, type, q, x }) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // 노이즈 버퍼 생성 (0.2초 분량 미리 생성해두는 최적화 가능하지만, 여기선 동적 생성)
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
        filter.frequency.setValueAtTime(frequency, now);
        // 주파수도 살짝 감소시켜 타격감 부여
        filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, now + duration);
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
     * Roll 버튼 효과음
     */
    playRollButtonSound() {
        if (!this.enabled || !this.initialized || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const duration = 0.04;

        // ... 기존 코드 유지 ...
        // 최적화를 위해 코드는 재사용하지만, 여기서는 단순화를 위해 전체 복사

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        filter.Q.value = 8;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + duration);
    }

    /**
     * Home/일반 버튼 효과음
     */
    playButtonSound() {
        if (!this.enabled || !this.initialized || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * 토글 버튼 효과음
     */
    playToggleSound() {
        if (!this.enabled || !this.initialized || !this.audioContext) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const duration = 0.05;

        // 1. 노이즈 버스트
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 2;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // 2. 짧은 톤
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.1, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + duration);
        osc.start(now);
        osc.stop(now + 0.03);
    }

    /**
     * 사운드 활성화/비활성화
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.audioContext) {
            this.audioContext.suspend();
        } else if (enabled && this.audioContext) {
            this.audioContext.resume();
        }
    }

    /**
     * 음소거 토글
     * @returns {boolean} 현재 활성화 상태
     */
    toggleMute() {
        this.setEnabled(!this.enabled);
        return this.enabled;
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
