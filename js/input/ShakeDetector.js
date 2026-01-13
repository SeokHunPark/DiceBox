/**
 * ShakeDetector - 모바일 흔들기 감지
 * DeviceMotion 이벤트를 사용하여 흔들림을 감지
 */
export class ShakeDetector {
    constructor() {
        this.threshold = 15; // 흔들림 감지 임계값 (m/s^2)
        this.lastX = null;
        this.lastY = null;
        this.lastZ = null;
        this.lastTime = 0;
        this.cooldown = 1000; // 흔들림 감지 후 대기 시간 (ms)
        this.onShake = null; // 흔들림 감지 시 호출될 콜백
        this.enabled = false;

        this.handleMotion = this.handleMotion.bind(this);
    }

    /**
     * 감지 시작
     * @param {Function} callback - 흔들림 감지 시 실행할 함수
     */
    start(callback) {
        if (this.enabled) return;

        this.onShake = callback;
        this.enabled = true;
        this.lastTime = performance.now();

        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', this.handleMotion, false);
        } else {
            console.warn('DeviceMotionEvent is not supported on this device.');
        }
    }

    /**
     * 감지 중지
     */
    stop() {
        if (!this.enabled) return;

        this.enabled = false;
        window.removeEventListener('devicemotion', this.handleMotion, false);
    }

    /**
     * iOS 권한 요청 (iOS 13+)
     * 사용자 인터랙션(버튼 클릭 등) 내에서 호출해야 함
     */
    async requestPermission() {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    return true;
                } else {
                    console.warn('DeviceMotion permission denied.');
                    return false;
                }
            } catch (e) {
                console.error('Error requesting DeviceMotion permission:', e);
                return false;
            }
        }
        return true; // 권한 요청이 필요 없는 경우
    }

    /**
     * 모션 이벤트 핸들러
     */
    handleMotion(event) {
        if (!this.enabled) return;

        const now = performance.now();
        if (now - this.lastTime < this.cooldown) return;

        const current = event.accelerationIncludingGravity;

        if (this.lastX !== null) {
            const deltaX = Math.abs(this.lastX - current.x);
            const deltaY = Math.abs(this.lastY - current.y);
            const deltaZ = Math.abs(this.lastZ - current.z);

            // 단순화된 흔들림 감지 로직
            if (deltaX + deltaY + deltaZ > this.threshold) {
                if (this.onShake) {
                    this.onShake();
                    this.lastTime = now;
                }
            }
        }

        this.lastX = current.x;
        this.lastY = current.y;
        this.lastZ = current.z;
    }
}
