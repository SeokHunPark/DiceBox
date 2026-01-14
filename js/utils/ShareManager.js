/**
 * ShareManager - 결과 공유 관리
 * Canvas 캡처 및 Web Share API 연동
 */
export class ShareManager {
    constructor() {
        this.canvas = document.getElementById('dice-canvas');
        this.isSharing = false;
    }

    /**
     * 현재 화면을 캡처하여 공유
     * @param {string} text - 공유할 텍스트 (예: "Total: 12")
     */
    async shareResult(text = 'My Dice Roll Result') {
        if (this.isSharing) return;
        this.isSharing = true;

        try {
            // 1. 캔버스 캡처
            const blob = await this.captureCanvas();
            if (!blob) throw new Error('Failed to capture canvas');

            // 2. 파일 객체 생성
            const file = new File([blob], 'dice-result.png', { type: 'image/png' });
            const shareData = {
                title: 'Dice Box Result',
                text: `${text}\n🎲 Rolled with Dice Box`,
                files: [file]
            };

            // 디버그 로그
            console.log('🔍 Share Debug:', {
                hasShare: !!navigator.share,
                hasCanShare: !!navigator.canShare,
                canShareFiles: navigator.canShare ? navigator.canShare(shareData) : false,
                isSecureContext: window.isSecureContext
            });

            // 3. Web Share API 시도 (HTTPS 또는 localhost에서만 동작)
            if (!window.isSecureContext) {
                console.warn('⚠️ Web Share API requires HTTPS. Falling back to download.');
                this.downloadImage(blob);
                return;
            }

            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                console.log('✅ Shared successfully');
            } else if (navigator.share) {
                // 파일 공유 미지원 시 텍스트만 공유
                await navigator.share({ title: 'Dice Box', text: `${text}\n🎲 Rolled with Dice Box` });
                console.log('✅ Shared text only');
            } else {
                // Web Share API 미지원: 다운로드
                this.downloadImage(blob);
                console.log('⬇️ Downloaded (Web Share API not supported)');
            }

        } catch (error) {
            // 사용자가 공유 취소한 경우는 무시
            if (error.name !== 'AbortError') {
                console.error('❌ Share failed:', error);
                // 실패 시 다운로드로 폴백
                try {
                    const blob = await this.captureCanvas();
                    if (blob) this.downloadImage(blob);
                } catch (e) {
                    alert('공유하기에 실패했습니다.');
                }
            }
        } finally {
            this.isSharing = false;
        }
    }

    /**
     * 캔버스를 Blob으로 변환
     */
    captureCanvas() {
        return new Promise((resolve) => {
            if (!this.canvas) {
                resolve(null);
                return;
            }
            this.canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    }

    /**
     * 이미지 다운로드 (PC용 폴백)
     */
    downloadImage(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dice-box-result-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
