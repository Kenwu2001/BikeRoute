export function speak(text) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-TW';
  utt.rate = 1;
  utt.pitch = 1;
  speechSynthesis.speak(utt);
}
