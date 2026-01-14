/**
 * StartUI - 시작 화면 UI 관리
 */
export class StartUI {
    constructor() {
        this.diceCountSlider = document.getElementById('dice-count');
        this.diceCountDisplay = document.getElementById('dice-count-display');
        this.colorPalette = document.getElementById('color-palette');
        this.diceTypeSelector = document.getElementById('dice-type-selector');
        this.rollBtn = document.getElementById('roll-btn');

        this.selectedColor = '#e74c3c';
        this.selectedType = 'd6'; // 기본 D6
        this.diceCount = 2;

        this.onRoll = null; // 콜백 함수

        this.init();
    }

    init() {
        // 슬라이더 이벤트
        this.diceCountSlider.addEventListener('input', (e) => {
            this.diceCount = parseInt(e.target.value);
            this.diceCountDisplay.textContent = this.diceCount;
        });

        // 주사위 종류 선택 이벤트
        if (this.diceTypeSelector) {
            this.diceTypeSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('.dice-type-btn');
                if (!btn) return;

                // 기존 선택 해제
                this.diceTypeSelector.querySelectorAll('.dice-type-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // 새 선택 활성화
                btn.classList.add('active');
                this.selectedType = btn.dataset.type;
            });
        }

        // 색상 팔레트 이벤트
        this.colorPalette.addEventListener('click', (e) => {
            const btn = e.target.closest('.color-btn');
            if (!btn) return;

            // 기존 선택 해제
            this.colorPalette.querySelectorAll('.color-btn').forEach(b => {
                b.classList.remove('active');
            });

            // 새 선택 활성화
            btn.classList.add('active');
            this.selectedColor = btn.dataset.color;
        });

        // Roll 버튼 이벤트
        this.rollBtn.addEventListener('click', () => {
            if (this.onRoll) {
                this.onRoll({
                    count: this.diceCount,
                    color: this.selectedColor,
                    type: this.selectedType
                });
            }
        });
    }

    /**
     * 설정 값 반환
     */
    getSettings() {
        return {
            count: this.diceCount,
            color: this.selectedColor,
            type: this.selectedType
        };
    }

    /**
     * Roll 버튼 콜백 설정
     */
    setOnRoll(callback) {
        this.onRoll = callback;
    }
}
