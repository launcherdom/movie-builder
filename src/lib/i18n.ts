export type Locale = "en" | "ko";

export const translations = {
  en: {
    // App
    appTitle: "MOVIE BUILDER",

    // Nav steps
    steps: {
      prompt: "CONCEPT",
      story: "STORY",
      characters: "CHARACTERS",
      storyboard: "BOARD",
      video: "VIDEO",
    },

    // Prompt step
    prompt: {
      heading: "01 — CONCEPT",
      label: "What's your story?",
      placeholder: "A detective investigates a murder that turns out to be her own...",
      genre: "Genre",
      tone: "Tone",
      visualStyle: "Visual Style",
      duration: "Duration",
      aspectRatio: "Aspect Ratio",
      vertical: "VERTICAL",
      cinematic: "CINEMATIC",
      generate: "GENERATE STORY ──→",
      generating: "[GENERATING...]",
      errorEmpty: "Please enter your story concept.",
      errorFail: "Story generation failed.",
    },

    // Story step
    story: {
      heading: "02 — STORY",
      noStory: "[NO STORY — return to CONCEPT]",
      characters: "CHARACTERS",
      scene: "SCENE",
      next: "DEFINE CHARACTERS ──→",
    },

    // Characters step
    characters: {
      heading: "03 — CHARACTERS",
      all: "ALL CHARACTERS",
      generateAll: "GENERATE ALL SHEETS",
      generating: "[GENERATING...]",
      allDone: "ALL SHEETS DONE",
      next: "GENERATE STORYBOARD ──→",
      noStory: "[NO STORY — return to CONCEPT]",
    },

    // Storyboard step
    storyboard: {
      heading: "04 — BOARD",
      panels: "PANELS",
      noStory: "[NO STORY — return to CONCEPT]",
      next: "GENERATE VIDEO ──→",
    },

    // Video step
    video: {
      heading: "05 — VIDEO",
      clips: "CLIPS",
      generateAll: "GENERATE ALL",
      noStory: "[NO STORY — return to CONCEPT]",
      assemble: "ASSEMBLE & EXPORT",
      assembleBtn: "▶ ASSEMBLE",
      assembling: "[ASSEMBLING...]",
      download: "↓ DOWNLOAD MP4",
      noPanel: "No storyboard panel — generate panel first.",
      errorFail: "Video generation failed",
      assemblyFail: "Assembly failed",
      keyframe: "KEYFRAME",
      generateKeyframe: "▶ KEYFRAME",
      generatingKeyframe: "[KEYFRAME...]",
      noKeyframe: "No keyframe — generate keyframe first.",
    },

    // Theme toggle
    dark: "DARK",
    light: "LIGHT",
  },

  ko: {
    // App
    appTitle: "무비 빌더",

    // Nav steps
    steps: {
      prompt: "콘셉트",
      story: "스토리",
      characters: "캐릭터",
      storyboard: "보드",
      video: "영상",
    },

    // Prompt step
    prompt: {
      heading: "01 — 콘셉트",
      label: "어떤 이야기인가요?",
      placeholder: "형사가 살인 사건을 수사하다 피해자가 자신임을 알게 된다...",
      genre: "장르",
      tone: "톤",
      visualStyle: "비주얼 스타일",
      duration: "길이",
      aspectRatio: "화면 비율",
      vertical: "세로형",
      cinematic: "와이드",
      generate: "스토리 생성 ──→",
      generating: "[생성 중...]",
      errorEmpty: "스토리 콘셉트를 입력해주세요.",
      errorFail: "스토리 생성에 실패했습니다.",
    },

    // Story step
    story: {
      heading: "02 — 스토리",
      noStory: "[스토리 없음 — 콘셉트 탭으로 돌아가세요]",
      characters: "등장인물",
      scene: "씬",
      next: "캐릭터 설정 ──→",
    },

    // Characters step
    characters: {
      heading: "03 — 캐릭터",
      all: "전체 캐릭터",
      generateAll: "시트 전체 생성",
      generating: "[생성 중...]",
      allDone: "시트 생성 완료",
      next: "스토리보드 생성 ──→",
      noStory: "[스토리 없음 — 콘셉트 탭으로 돌아가세요]",
    },

    // Storyboard step
    storyboard: {
      heading: "04 — 보드",
      panels: "패널",
      noStory: "[스토리 없음 — 콘셉트 탭으로 돌아가세요]",
      next: "영상 생성 ──→",
    },

    // Video step
    video: {
      heading: "05 — 영상",
      clips: "클립",
      generateAll: "전체 생성",
      noStory: "[스토리 없음 — 콘셉트 탭으로 돌아가세요]",
      assemble: "조립 & 내보내기",
      assembleBtn: "▶ 조립",
      assembling: "[조립 중...]",
      download: "↓ MP4 다운로드",
      noPanel: "스토리보드 패널 없음 — 먼저 패널을 생성하세요.",
      errorFail: "영상 생성 실패",
      assemblyFail: "조립 실패",
      keyframe: "키프레임",
      generateKeyframe: "▶ 키프레임",
      generatingKeyframe: "[키프레임...]",
      noKeyframe: "키프레임 없음 — 먼저 키프레임을 생성하세요.",
    },

    // Theme toggle
    dark: "다크",
    light: "라이트",
  },
};

export type Translations = typeof translations.en;
