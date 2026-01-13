/**
 * Dice Box - Main Entry Point
 * 물리 기반 3D 주사위 시뮬레이터
 */

import { SceneManager } from './scene/SceneManager.js';
import { DiceManager } from './dice/DiceManager.js';
import { StartUI } from './ui/StartUI.js';
import { ResultUI } from './ui/ResultUI.js';
import { i18n } from './i18n/i18n.js';
import { soundManager } from './audio/SoundManager.js';

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
    }

    /**
     * 앱 초기화 (비동기)
     */
    async init() {
        // i18n 초기화 (언어 로드)
        await i18n.init();

        // 언어 선택 드롭다운 이벤트 연결
        this.initLanguageSelector();

        // 사운드 매니저 초기화 (사용자 인터랙션 전 준비)
        this.initSound();

        // Manager 초기화
        this.sceneManager = new SceneManager();

        const canvas = document.getElementById('dice-canvas');
        this.diceManager = new DiceManager(canvas);

        // 🔊 물리 엔진에 충돌 콜백 직접 연결 (캐싱 우회)
        this.diceManager.physics.setOnCollision((type, velocity, x) => {
            soundManager.playCollision(type, velocity, x);
        });

        this.rollingIndicator = document.getElementById('rolling-indicator');

        // UI 초기화 및 이벤트 연결
        this.initStartUI();
        this.initResultUI();

        console.log('🎲 Dice Box initialized!');
    }

    /**
     * 사운드 매니저 초기화
     * 첫 사용자 인터랙션 시 AudioContext 활성화
     */
    initSound() {
        const activateSound = () => {
            soundManager.init();
            soundManager.resume();
            // 한 번만 실행
            document.removeEventListener('click', activateSound);
            document.removeEventListener('touchstart', activateSound);
        };

        document.addEventListener('click', activateSound);
        document.addEventListener('touchstart', activateSound);
    }

    /**
     * 언어 선택 드롭다운 초기화
     */
    initLanguageSelector() {
        const langSelector = document.getElementById('lang-selector');
        if (!langSelector) return;

        // 현재 언어로 드롭다운 설정
        langSelector.value = i18n.getCurrentLang();

        // 언어 변경 이벤트
        langSelector.addEventListener('change', async (e) => {
            await i18n.setLanguage(e.target.value);
        });
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
window.addEventListener('DOMContentLoaded', async () => {
    const app = new DiceBoxApp();
    await app.init();
});
