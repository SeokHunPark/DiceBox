/**
 * Dice Box - Main Entry Point
 * 물리 기반 3D 주사위 시뮬레이터
 */

import { SceneManager } from './scene/SceneManager.js';
import { DiceManager } from './dice/DiceManager.js';
import { StartUI } from './ui/StartUI.js';
import { ResultUI } from './ui/ResultUI.js';

class DiceBoxApp {
    constructor() {
        this.sceneManager = null;
        this.diceManager = null;
        this.startUI = null;
        this.resultUI = null;
        this.rollingIndicator = null;

        this.currentSettings = {
            count: 2,
            color: '#e74c3c'
        };

        this.init();
    }

    init() {
        // Manager 초기화
        this.sceneManager = new SceneManager();

        const canvas = document.getElementById('dice-canvas');
        this.diceManager = new DiceManager(canvas);

        this.rollingIndicator = document.getElementById('rolling-indicator');

        // UI 초기화 및 이벤트 연결
        this.initStartUI();
        this.initResultUI();

        console.log('🎲 Dice Box initialized!');
    }

    initStartUI() {
        this.startUI = new StartUI();

        this.startUI.setOnRoll((settings) => {
            this.currentSettings = settings;
            this.startRolling();
        });
    }

    initResultUI() {
        this.resultUI = new ResultUI();

        this.resultUI.setOnReroll(() => {
            this.startRolling();
        });

        this.resultUI.setOnHome(() => {
            this.sceneManager.switchTo('start');
        });
    }

    /**
     * 주사위 굴리기 시작
     */
    async startRolling() {
        const { count, color } = this.currentSettings;

        // Rolling Scene으로 전환
        this.sceneManager.switchTo('rolling');
        this.showRollingIndicator(true);

        // 주사위 색상 설정 및 굴리기
        this.diceManager.setDiceColor(color);
        const results = await this.diceManager.roll(count);

        // 결과 표시
        this.showRollingIndicator(false);
        this.showResults(results);
    }

    /**
     * 결과 화면 표시
     */
    showResults(results) {
        this.resultUI.displayResults(results);
        this.sceneManager.switchTo('result');
    }

    /**
     * Rolling 인디케이터 표시/숨김
     */
    showRollingIndicator(visible) {
        if (visible) {
            this.rollingIndicator.classList.add('visible');
        } else {
            this.rollingIndicator.classList.remove('visible');
        }
    }
}

// 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    new DiceBoxApp();
});
