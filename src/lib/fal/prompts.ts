import type { Character } from "@/types/movie";

export const CHARACTER_SHEET_PROMPT_TEMPLATE = `A character reference sheet in the style of: {VISUAL_STYLE}. Pure white seamless background. Consistent studio lighting throughout.

FACE PRIORITY: The character's facial features must be identical across every image — same eye shape, eye color, nose, lips, jawline, skin tone, brow shape, and hair. Facial consistency is non-negotiable.

Left side — full-body views, three angles:
1. Front: standing naturally, arms at sides, full body head to toe
2. Side (left profile): same pose, full body
3. Back: full body showing hair and outfit from behind
All three figures must be the exact same character with identical features, rendered in the same {VISUAL_STYLE} style.

Upper-right — six face/head reference images of the same character:
- Large front-facing portrait (dominant)
- Slight downward angle
- Back of head showing hairstyle
- Left profile
- 3/4 angle portrait
- Extreme close-up of face filling the frame

Lower-right — six detail close-ups:
- Upper garment texture
- Lower body clothing
- Waist / belt detail
- Hands or arm detail
- Eye and facial feature close-up
- Footwear

Character: {CHARACTER_DESCRIPTION}

Output: Landscape composition, white background, full layout visible, no cropping, no text labels, no watermarks.`;

export function buildCharacterSheetPrompt(character: Character, visualStyle: string): string {
  return CHARACTER_SHEET_PROMPT_TEMPLATE
    .replace("{VISUAL_STYLE}", visualStyle)
    .replace("{CHARACTER_DESCRIPTION}", character.description);
}
