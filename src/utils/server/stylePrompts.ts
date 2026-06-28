export function makeBrighterPrompt(suffix = "光と影のバランスをよくし、肌色の自然さを保ってください。"): string {
  return `露出を+0.5段明るく、ホワイトバランスを少し暖かく調整し、シャドウを持ち上げてください。${suffix}`;
}

export function makeSepiaPrompt(): string {
  return "全体の色調をセピアに寄せ、コントラストを少し落としたレトロな写真の雰囲気に仕上げてください。";
}

export function makeStampPrompt(): string {
  return "境界線を太くはっきりさせ、白い縁取りを加えて、スタンプや消しゴム印のように単純化してください。背景は透明に近く、ホワイトと1〜2色の線だけで構成してください。";
}

export function makePopPrompt(): string {
  return "コントラストを高め、彩度を上げ、余計なディテールを抑えてポップなイラストのような仕上がりにしてください。";
}
