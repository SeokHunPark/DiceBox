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
     * 기본 언어(en)를 먼저 로드하고, 선택된 언어로 덮어쓰는 방식으로 폴백 구현
     * @param {string} lang - 언어 코드
     */
    async loadLanguage(lang) {
        try {
            // 1. 기본 언어(en) 로드
            const defaultResponse = await fetch(`./js/i18n/languages/en.json`);
            const defaultTranslations = await defaultResponse.json();

            // 2. 대상 언어가 en이면 바로 적용
            if (lang === 'en') {
                this.translations = defaultTranslations;
                return;
            }

            // 3. 대상 언어 로드
            try {
                const response = await fetch(`./js/i18n/languages/${lang}.json`);
                const targetTranslations = await response.json();

                // 4. 병합 (Deep Merge)
                this.translations = this.deepMerge(defaultTranslations, targetTranslations);
            } catch (error) {
                console.warn(`Failed to load language: ${lang}, falling back to English`, error);
                this.translations = defaultTranslations;
            }

        } catch (error) {
            console.error('CRITICAL: Failed to load default language (en)', error);
            this.translations = {}; // 빈 객체로 초기화하여 크래시 방지
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
     * 객체 깊은 병합 (Deep Merge)
     * @param {Object} target 
     * @param {Object} source 
     * @returns {Object}
     */
    deepMerge(target, source) {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /**
     * 번역 텍스트 가져오기 (중첩 키 지원)
     * @param {string} key - 번역 키 (예: 'section.title')
     * @returns {string} 번역된 텍스트
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && value[k] !== undefined) {
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

/**
 * 객체 확인 헬퍼 함수
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
