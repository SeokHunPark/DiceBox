/**
 * ResultUI - 결과 화면 UI 관리
 */
export class ResultUI {
    constructor() {
        this.totalValue = document.getElementById('total-value');
        this.diceGroups = document.getElementById('dice-groups');
        this.rerollBtn = document.getElementById('reroll-btn');
        this.homeBtn = document.getElementById('home-btn');

        this.onReroll = null;
        this.onHome = null;

        this.init();
    }

    init() {
        this.rerollBtn.addEventListener('click', () => {
            if (this.onReroll) this.onReroll();
        });

        this.homeBtn.addEventListener('click', () => {
            if (this.onHome) this.onHome();
        });
    }

    /**
     * 결과 표시
     * @param {number[]} results - 각 주사위 눈금 배열
     */
    displayResults(results) {
        // 합계 계산
        const total = results.reduce((sum, val) => sum + val, 0);
        this.totalValue.textContent = total;

        // 눈금별 그룹핑
        const groups = this.groupResults(results);
        this.renderGroups(groups);
    }

    /**
     * 결과를 눈금별로 그룹핑
     */
    groupResults(results) {
        const groups = {};

        results.forEach(value => {
            if (!groups[value]) {
                groups[value] = 0;
            }
            groups[value]++;
        });

        // 눈금 순으로 정렬
        return Object.entries(groups)
            .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
            .map(([value, count]) => ({ value: parseInt(value), count }));
    }

    /**
     * 그룹 UI 렌더링
     */
    renderGroups(groups) {
        this.diceGroups.innerHTML = '';

        groups.forEach(({ value, count }) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'dice-group';
            groupEl.innerHTML = `
        <span class="dice-group-value">${this.getDiceEmoji(value)} ${value}</span>
        <span class="dice-group-count">×${count}</span>
      `;
            this.diceGroups.appendChild(groupEl);
        });
    }

    /**
     * 눈금에 맞는 주사위 이모지 반환
     */
    getDiceEmoji(value) {
        const emojis = {
            1: '⚀',
            2: '⚁',
            3: '⚂',
            4: '⚃',
            5: '⚄',
            6: '⚅'
        };
        return emojis[value] || '🎲';
    }

    /**
     * 콜백 설정
     */
    setOnReroll(callback) {
        this.onReroll = callback;
    }

    setOnHome(callback) {
        this.onHome = callback;
    }
}
