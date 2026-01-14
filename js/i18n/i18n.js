/**
 * i18n - 다국어 지원 매니저
 * 언어 전환 및 텍스트 번역을 담당
 */
export class I18n {
    constructor() {
        /** @type {Object} 현재 로드된 번역 데이터 */
        this.translations = {};

        /** @type {string} 현재 언어 코드 */
        this.currentLang = 'en';

        /** @type {string[]} 지원 언어 목록 */
        this.supportedLangs = ['ko', 'en', 'ja'];

        /** @type {Object} 언어별 표시 이름 */
        this.langNames = {
            ko: '한국어',
            en: 'English',
            ja: '日本語'
        };
    }

    /**
     * i18n 초기화 - 저장된 언어 또는 브라우저 언어 감지
     */
    async init() {
        // localStorage에서 저장된 언어 확인
        const savedLang = localStorage.getItem('dicebox-lang');

        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
        } else {
            // 브라우저 언어 감지
            const browserLang = navigator.language.split('-')[0];
            this.currentLang = this.supportedLangs.includes(browserLang) ? browserLang : 'en';
        }

        await this.loadLanguage(this.currentLang);
        this.applyTranslations();
    }

    /**
     * 언어 파일 로드
     * @param {string} lang - 언어 코드
     */
    async loadLanguage(lang) {
        try {
            const response = await fetch(`./js/i18n/languages/${lang}.json`);
            this.translations = await response.json();
        } catch (error) {
            console.error(`Failed to load language: ${lang}`, error);
            // 폴백: 영어 로드 시도
            if (lang !== 'en') {
                await this.loadLanguage('en');
            }
        }
    }

    /**
     * 언어 변경
     * @param {string} lang - 언어 코드
     */
    async setLanguage(lang) {
        if (!this.supportedLangs.includes(lang)) return;

        this.currentLang = lang;
        localStorage.setItem('dicebox-lang', lang);

        await this.loadLanguage(lang);
        this.applyTranslations();

        // HTML lang 속성 업데이트
        document.documentElement.lang = lang;
    }

    /**
     * 번역 텍스트 가져오기
     * @param {string} key - 번역 키
     * @returns {string} 번역된 텍스트
     */
    /**
     * 번역 텍스트 가져오기 (중첩 키 지원)
     * @param {string} key - 번역 키 (예: 'section.title')
     * @returns {string} 번역된 텍스트
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // 키를 찾지 못하면 키 자체 반환
            }
        }

        return value;
    }

    /**
     * 모든 data-i18n 요소에 번역 적용
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.innerHTML = this.t(key); // HTML 태그 지원을 위해 innerHTML 사용
        });

        // placeholder 번역
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.t(key);
        });

        // HTML lang 속성 업데이트
        document.documentElement.lang = this.currentLang;
    }

    /**
     * 현재 언어 코드 반환
     * @returns {string}
     */
    getCurrentLang() {
        return this.currentLang;
    }

    /**
     * 지원 언어 목록 반환
     * @returns {Array<{code: string, name: string}>}
     */
    getSupportedLanguages() {
        return this.supportedLangs.map(code => ({
            code,
            name: this.langNames[code]
        }));
    }
}

// 싱글톤 인스턴스
export const i18n = new I18n();
