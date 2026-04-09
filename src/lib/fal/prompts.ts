import type { Character } from "@/types/movie";

export const CHARACTER_SHEET_PROMPT_TEMPLATE = `A high-definition, clean, minimalist character design board / character turnaround reference sheet, set against a pure white background. The overall presentation should resemble a professional game art character modeling sheet, fashion design reference page, character design sheet, or character turnaround board. The layout should be neat and well-organized, with clearly divided information sections, a realistic and premium visual quality, consistent lighting, and strict character consistency throughout.

FACE PRIORITY: The character's facial features are the most important element. Every view must show the exact same face: identical eye shape, eye color, nose structure, lip shape, jawline, skin tone, and brow shape. The face must be instantly recognizable as the same individual from any angle. Facial consistency is non-negotiable across all views.

On the left side of the composition, show the character's full-body three-view turnaround, occupying the main visual area, including: 1. Front full-body standing pose 2. Left-side full-body standing pose 3. Back full-body standing pose  All three figures must be the exact same character, with identical facial features, hairstyle, clothing, body shape, and height proportions. The standing pose should feel natural, with both arms hanging naturally at the sides. This should be suitable as a character modeling reference. The camera angle should be eye level, with neutral studio lighting, no obstruction, no exaggerated perspective, and no complex background.

The right side of the composition should be divided into two sections:

In the upper-right section, place six headshot / head-angle reference images of the same character, arranged neatly to show different head perspectives, including: - Front-facing portrait (LARGEST, centered) - Slight downward angle - Back of the head - Left-side facial profile - 3/4 profile portrait - Close-up of face only, filling the frame  Each head reference must show photorealistic, highly detailed facial features with sharp clarity. The eyes, nose, and mouth must be rendered with maximum precision — these serve as the canonical face reference for AI video generation.

In the lower-right section, place six close-up detail images of the character, arranged into a clean grid, showing key design details, including: - Close-up of the upper garment fabric texture - Front close-up of the lower-body clothing - Close-up of the hip / tailoring detail - Close-up of the leg or skin texture detail - Close-up of the eyes or facial feature details - Full close-up of the shoes as a standalone item  All detail images must match the main character's outfit and appearance exactly. Materials should look realistic, and the details should be clean and precise, suitable as clothing and accessory modeling references.

Overall style requirements: Minimalist, professional, realistic, unified, clean, and premium, similar to a character design board, fashion design reference sheet, 3D character modeling reference page, or character turnaround presentation board. The character edges should be sharp, garment shapes should be clearly defined, hair strands should appear natural, skin should look refined, and material rendering should be accurate. The overall layout should have generous white space, as if it were made by a professional concept art team.

Character setup: {CHARACTER_DESCRIPTION}

Output requirements: Landscape composition, white background, full character visible, no cropping, no extra props, no explanatory text, no logo, no watermark, no UI interface elements, no like/save buttons, and no social-media-screenshot appearance.`;

export function buildCharacterSheetPrompt(character: Character): string {
  return CHARACTER_SHEET_PROMPT_TEMPLATE.replace(
    "{CHARACTER_DESCRIPTION}",
    character.description
  );
}
