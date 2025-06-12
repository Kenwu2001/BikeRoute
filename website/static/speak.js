// static/js/speak.js
import { templates } from './templates.js';

/**
 * 根據 ID 在 templates 中找對應模板物件
 */
function findTemplateById(templateId) {
  for (const category of Object.values(templates)) {
    for (const tmpl of category) {
      if (tmpl.id === templateId) return tmpl;
    }
  }
  console.warn(`未找到 template ID：${templateId}`);
  return null;
}

/**
 * 根據 template ID 和參數，產生語音文字
 */
export function generateSpeech(templateId, params = {}) {
  const tmpl = findTemplateById(templateId);
  if (!tmpl) return null;

  let text = tmpl.template;

  // 替換所有 {{key}} 為參數值
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(`{{${key}}}`, value);
  }

  return text;
}

/**
 * 播放語音（單純文字）
 */
export function speak(text) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-TW';
  utt.rate = 1;
  utt.pitch = 1;
  speechSynthesis.speak(utt);
}

/**
 * 綜合函式：從 template ID + 參數產生語音並播報
 */
export function speakFromTemplate(templateId, params = {}) {
  const text = generateSpeech(templateId, params);
  if (text) speak(text);
}
