export type PromptOption = {
  id: string;
  label: string;
  prompt: string;
  category: string;
};

export const PROMPT_PRESETS: PromptOption[] = [
  {
    id: "figurine",
    label: "1/7スケール・デスクトップフィギュア仕上げ",
    category: "クリエイティブ",
    prompt:
      "Render a high-resolution photo of a 1/7 scale, fully commercialized figurine based on the character(s) in the uploaded image. Place the collectible on a modern computer desk inside a real-world studio environment with soft key and rim lighting. Keep the sculpt faithful to the original pose, costume, and likeness, but translate materials into premium painted PVC with subtle weathering. Mount the figure on a round, transparent acrylic base. Show the computer monitor displaying the 3D modeling viewport of this same figurine, and stage a deluxe packaging box beside it featuring flat, illustrated box art inspired by top-tier collectibles. Emphasize tangible materials, lens depth of field, and natural reflections.",
  },
  {
    id: "mono-top-angle-portrait",
    label: "トップアングル・モノクロ肖像",
    category: "クリエイティブ",
    prompt:
      "Top-angle, close-up black-and-white portrait of the uploaded subject captured with a 35mm lens aesthetic. Keep only the face, upper chest, and one shoulder in frame, facing forward with a proud, composed expression. Use crisp 10.7K 4HD quality, sculpting dramatic contrast with soft key light and deep black shadows that dissolve into the background. Emphasize precise skin texture, subtle monochrome tonality, and clean studio styling while avoiding any props or additional scenery.",
  },
  {
    id: "avatar-grid",
    label: "3x3ヘアスタイル・アバター生成",
    category: "ビジネス",
    prompt:
      "Produce a polished 3x3 grid of square avatar portraits of the same person. Keep consistent studio lighting, a soft gradient background, and uniform framing. Vary the hairstyle dramatically in each tile, changing length, color, and styling accessories while preserving facial features, skin tone, and expression continuity. Output as a single cohesive grid image with thin dividers.",
  },
  {
    id: "studio-strip-grid",
    label: "3x3スタジオフォトストリップ",
    category: "クリエイティブ",
    prompt:
      "Turn the uploaded photo into a contact-sheet style 3x3 grid composed of narrow vertical photo strips. Maintain consistent high-end studio lighting, seamless neutral backdrops, and coordinated wardrobe styling throughout. In each strip, direct the subject through a different pose and facial expression that feels suitable for professional headshots, editorial portraits, or fashion lookbooks. Balance the grid with thin white gutters, subtle film-edge markings, and natural skin retouching while preserving likeness. Deliver as one unified layout with crisp resolution.",
  },
  {
    id: "lego-pack",
    label: "LEGOミニフィグ・パッケージ演出",
    category: "クリエイティブ",
    prompt:
      "Reimagine the subject as a LEGO minifigure product hero shot rendered in glossy, high-resolution 3D. Present an isometric packaging box with bold branding, age rating, and illustrated character art on the panels. Inside the box window, showcase the customized minifigure plus essential accessories inspired by the person's signature items (makeup, bags, tools, etc.). Beside the packaging, display the actual assembled minifigure posed on a reflective surface. Keep colors saturated, lighting cinematic, and the overall composition sharp and realistic.",
  },
  {
    id: "city-selfie",
    label: "巨大セルフィー都市建設シーン",
    category: "ファンタジー",
    prompt:
      "Create a hyper-realistic large-format render of the person as a towering giant taking a smartphone selfie in the center of a city square. Surround the figure with dense scaffolding populated by tiny construction workers actively detailing the surface. Fill the environment with modern glass buildings, moving buses and cars, scattered pedestrians, street furniture, and a vibrant blue daylight sky. Maintain photo-real textures on skin, clothing, and infrastructure, with dramatic cinematic lighting and crisp depth of field.",
  },
  {
    id: "retro-platformer",
    label: "16ビット・プラットフォーマー主人公化",
    category: "クリエイティブ",
    prompt:
      "Recreate the uploaded character as the pixel-perfect protagonist of a side-scrolling 16-bit platformer. Translate their outfit, silhouette, and signature props into vibrant 32x48-pixel sprite sheets with exaggerated key poses for idle, run, jump, and attack animations. Render them mid-action on a multi-layer parallax level that matches their personality—include foreground platforms, collectible items, and distant background scenery painted in saturated dusk colors. Apply authentic SNES/Genesis-era color palettes, tile-based textures, and limited yet expressive shading while preserving facial likeness and iconic details. Frame the final image like a captured gameplay screenshot with retro UI elements such as hearts, score, and stage title.",
  },
  {
    id: "bikkuriman-sticker",
    label: "ビックリマンシール風ホロステッカー",
    category: "クリエイティブ",
    prompt:
      "Transform the subject into a retro 1980s Japanese Bikkuriman-style holographic sticker illustration. Depict the character as a super-deformed hero with a large head, compact body, and exaggerated expression, holding a symbolic accessory that reflects their personality. Surround them with bold katakana nameplates, radiant gold halos, and energetic onomatopoeia bursts rendered in thick cel-shaded outlines. Place the figure against a prismatic foil background with rainbow gradients, glittering stars, and embossed borders. Keep the overall composition as a perfectly centered 48mm square sticker that fills the frame edge-to-edge with no white borders or blank space, crisp and vibrant, evoking collector-grade printing.",
  },
  {
    id: "pirate-wanted",
    label: "海賊手配書パーチメント仕上げ",
    category: "ファンタジー",
    prompt:
      "Design an aged pirate wanted poster painted on distressed parchment. Preserve the subject's likeness while giving them authentic pirate styling such as a weathered tricorne hat, braids, and accessories. Use warm brown monochrome inks with watercolor bleeding, torn edges, and creases. Feature a large, close-up portrait centered near the top. Add a prominent fictitious bounty amount in an invented currency, and beneath it a short description of alleged crimes written in an original runic-style script (avoid English or Chinese characters). Include ornamental flourishes and stamp marks that feel hand-printed.",
  },
  {
    id: "martial-arcade",
    label: "対戦格闘シネマティック・アクション",
    category: "ファンタジー",
    prompt:
      "Stage a cinematic versus fighting game key art featuring the person from the first uploaded photo as Player 1 on the left and the second uploaded photo as Player 2 on the right. Capture both at a dynamic three-quarter angle mid-action with motion trails, energy effects, and expressive poses. Use a collapsing ruin environment on a purple alien world at sunrise, with dust, debris, and volumetric light. Overlay polished HUD elements: the title 'MORDON V'S DEATHSEED', health bars with character thumbnails, combo meters, and sparks. Render as a single ultra-sharp frame with dramatic contrast and vivid color grading.",
  },
  {
    id: "passport-blue",
    label: "証明写真・ビジネス仕様",
    category: "ビジネス",
    prompt:
      "Generate a professional 2-inch ID portrait cropped from the original image. Center the subject from the shoulders up, facing forward with a relaxed, friendly expression. Dress them in formal business attire, tidy hair, and minimal accessories. Use an even, solid blue background with soft studio lighting, no harsh shadows, and crisp focus.",
  },
  {
    id: "manga-line-art",
    label: "モノクロ漫画線画化",
    category: "クリエイティブ",
    prompt:
      "Convert the source photo into high-contrast black-and-white manga line art. Keep the subject's facial proportions accurate while stylizing with clean inked outlines, controlled hatching, and dynamic screentone shading for volume. Use bold line-weight variation, crisp highlights, and background speed lines or minimal panels that emphasize mood. Avoid grayscale gradients; rely solely on pure black and white.",
  },
  {
    id: "superhero-strip",
    label: "ヒーローコミック・ストーリー化",
    category: "ファンタジー",
    prompt:
      "Transform the uploaded image into a vibrant four-panel superhero comic strip. Develop a concise storyline with setup, rising action, climax, and resolution across the panels. Retain the subject's likeness as the protagonist, giving them a heroic costume and expressive poses. Include speech balloons, narration boxes, and sound effects with thoughtful typography. Apply bold halftone textures, dramatic lighting, and saturated comic-book coloring while keeping panel gutters clean and balanced.",
  },
  {
    id: "movie-poster",
    label: "映画ポスター・地下鉄構内仕上げ",
    category: "クリエイティブ",
    prompt:
      "Design a photorealistic movie poster inspired by the tone of the source image. Preserve the subject's core styling and likeness while allowing pose and expression adjustments for dramatic composition. Blend cinematic lighting, atmospheric effects, and supporting characters or set pieces that enhance the narrative. Present the finished poster mounted within a Japanese subway underground passage, with passersby, tiled walls, reflections, and ambient lighting creating realism. Include professional typography for the film title, credits block, and subtle marketing details integrated into the scene.",
  },
  {
    id: "beach-bottle",
    label: "1/7スケール・ガラス瓶ジオラマ仕上げ",
    category: "クリエイティブ",
    prompt:
      "Craft a premium 1/7 scale collectible diorama of the subject displayed inside a clear souvenir glass bottle. Sculpt the figure in a relaxed beach pose surrounded by fine sand, seashells, gentle surf, driftwood, and miniature tropical foliage. Light the scene with warm, directional sunlight casting soft shadows and caustic reflections through the glass. Place the bottle on an elegant wooden base with subtle reflections and maintain sharp, realistic textures on the figure and environment.",
  },
  {
    id: "age-progression",
    label: "ライフステージ年齢変化コラージュ",
    category: "クリエイティブ",
    prompt:
      "Produce a single ultra-high-resolution horizontal collage featuring five evenly spaced portraits of the same person at ages 5, 15, 25, 45, and 65. Maintain identical camera framing, straight-on head-and-shoulders, with soft, diffused studio lighting against a smooth warm-gray seamless backdrop. Ensure facial structure, eye color, and defining traits remain consistent while reflecting natural age progression in skin texture, hairstyle, and wardrobe appropriate to each life stage. Separate panels with slim white dividers and hand-lettered age labels centered beneath each portrait.",
  },
  {
    id: "retro-yearbook",
    label: "90年代イヤーブック見開き",
    category: "クリエイティブ",
    prompt:
      "Convert the original photo into a 1990s American high school yearbook double-page spread featuring two coordinated photos. Include a formal senior portrait on the left and a candid hallway snapshot on the right. Use teal and magenta gradient backdrops, geometric divider bars, doodle accents, and a playful neon hand-written signature with an upbeat senior quote. Style clothing, hair, and accessories to feel authentically 90s while preserving the subject's likeness. Lay out the spread with print-ready typography and light halftone texture.",
  },
  {
    id: "global-magazine-cover",
    label: "グローバル誌カバースター演出",
    category: "ビジネス",
    prompt:
      "Design a glossy international fashion magazine cover starring the subject. Dress them in avant-garde couture with confident posing and dramatic studio lighting against a minimalist color-blocked background. Maintain precise facial likeness and premium retouching. Add multilingual cover lines, barcode, issue date, and a sophisticated masthead, arranging typography to balance negative space. Apply subtle texture, shadows, and highlights so the cover feels ready for newsstand printing.",
  },
];
