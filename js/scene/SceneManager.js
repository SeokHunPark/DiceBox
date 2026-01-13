/**
 * SceneManager - Scene 전환 관리
 */
export class SceneManager {
  constructor() {
    this.scenes = {
      start: document.getElementById('start-scene'),
      rolling: document.getElementById('rolling-scene')
    };
    this.currentScene = 'start';
  }

  /**
   * 특정 Scene으로 전환
   * @param {string} sceneName - 'start' | 'rolling'
   */
  switchTo(sceneName) {
    if (!this.scenes[sceneName]) {
      console.warn(`Scene "${sceneName}" not found`);
      return;
    }

    // 모든 Scene 비활성화
    Object.values(this.scenes).forEach(scene => {
      if (scene) scene.classList.remove('active');
    });

    // 대상 Scene 활성화
    this.scenes[sceneName].classList.add('active');
    this.currentScene = sceneName;
  }

  /**
   * 현재 활성 Scene 반환
   */
  getCurrentScene() {
    return this.currentScene;
  }
}
