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
        this.resultOverlay = null;

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

        // 음소거 버튼 이벤트 연결
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const isEnabled = soundManager.toggleMute();
                muteBtn.textContent = isEnabled ? '🔊' : '🔇';
                muteBtn.classList.toggle('muted', !isEnabled);
            });
        }

        // 트레이 테마 선택 버튼 이벤트 연결
        const themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // UI 업데이트
                themeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 테마 적용
                const theme = btn.dataset.theme;
                this.setTheme(theme);
            });
        });
    }

    /**
     * 테마 설정 적용 (렌더러 + 사운드)
     */
    setTheme(theme) {
        console.log(`🎨 Theme changed to: ${theme}`);

        // 1. 렌더러 테마 변경 (시각적)
        if (this.diceManager && this.diceManager.renderer) {
            this.diceManager.renderer.setTheme(theme);
        }

        // 2. 사운드 재질 변경 (청각적)
        soundManager.setMaterial(theme);
    }

    initResultUI() {
        this.resultUI = new ResultUI();
        this.resultOverlay = document.getElementById('result-overlay');

        this.resultUI.setOnReroll(() => {
            soundManager.playRollButtonSound();
            this.hideResultOverlay();
            this.startRolling();
        });

        this.resultUI.setOnHome(() => {
            soundManager.playButtonSound();
            this.hideResultOverlay();
            this.sceneManager.switchTo('start');
        });

        // 결과 상세 보기 토글
        const toggleBtn = document.getElementById('toggle-detail-btn');
        const diceGroups = document.getElementById('dice-groups');

        if (toggleBtn && diceGroups) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = diceGroups.classList.contains('collapsed');
                if (isCollapsed) {
                    diceGroups.classList.remove('collapsed');
                    toggleBtn.classList.add('expanded');
                    soundManager.playToggleSound(); // 찰칵 소리
                } else {
                    diceGroups.classList.add('collapsed');
                    toggleBtn.classList.remove('expanded');
                    soundManager.playToggleSound(); // 찰칵 소리
                }
            });
        }
    }

    /**
     * 주사위 굴리기 시작
     */
    async startRolling() {
        const { count, color } = this.currentSettings;

        // Roll 버튼 효과음
        soundManager.playRollButtonSound();

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
     * 결과 오버레이 표시
     */
    showResults(results) {
        this.resultUI.displayResults(results);

        // 결과 표시 시 상세 내역 기본 펼침
        const diceGroups = document.getElementById('dice-groups');
        const toggleBtn = document.getElementById('toggle-detail-btn');

        if (diceGroups) diceGroups.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.classList.add('expanded');

        this.resultOverlay.classList.add('visible');
    }

    /**
     * 결과 오버레이 숨김
     */
    hideResultOverlay() {
        this.resultOverlay.classList.remove('visible');
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
