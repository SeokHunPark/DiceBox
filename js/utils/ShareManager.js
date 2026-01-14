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

            // 3. 공유 데이터 준비
            const shareData = {
                title: 'Dice Box Result',
                text: `${text}\n🎲 Rolled with Dice Box`,
                files: [file]
            };

            // 4. Web Share API 호출
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                console.log('✅ Shared successfully');
            } else {
                // PC 등 미지원 환경: 다운로드
                this.downloadImage(blob);
                console.log('⬇️ Downloaded image (Web Share API not supported)');
            }

        } catch (error) {
            console.error('❌ Share failed:', error);
            alert('공유하기에 실패했습니다. (브라우저 호환성 문제일 수 있습니다)');
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
