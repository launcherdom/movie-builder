import type { Character } from "@/types/movie";

export const CHARACTER_SHEET_PROMPT_TEMPLATE = `A photorealistic actor/actress reference photography sheet for a live-action film production. This is a casting and costume department reference — every image must look like a real photograph of a real human being. No illustration, no 3D rendering, no CGI, no digital art. Pure photorealism.

Pure white seamless studio backdrop throughout. Professional studio lighting: soft, even, shadowless — like a high-end fashion editorial or Hollywood costume reference shoot.

FACE PRIORITY: This person's facial features must be identical across every image. Same eye shape, eye color, nose, lips, jawline, skin tone, brow shape, and hair. The face must be instantly recognizable as the same real human from every angle. Photographic consistency is non-negotiable.

Left side — full-body editorial photography, three angles of the same outfit:
1. Front view: standing naturally, arms relaxed at sides, full body head to toe
2. Side view (left profile): same relaxed pose, full body
3. Back view: full body, showing hair and outfit from behind
All three photos must look like they were taken in the same studio session — same person, same clothes, same lighting.

Upper-right — six face/headshot reference photos of the same person:
- Large front-facing portrait (dominant image)
- Slight downward angle
- Back of head showing hairstyle
- Left profile
- 3/4 angle portrait
- Extreme close-up of face filling the frame
Every headshot must look like a real photograph — pores visible, natural skin texture, realistic eyes with catchlights.

Lower-right — six clothing and detail close-up photographs:
- Upper garment fabric and texture close-up
- Lower body / pants / skirt close-up
- Waist / belt / tailoring detail
- Hands or arm detail
- Eye and facial feature extreme close-up
- Footwear full shot
All detail shots must be photographic — real fabric texture, real material reflectance, no illustrated or painted look.

Overall requirements: Every single image in this reference sheet must look like a REAL PHOTOGRAPH of a REAL HUMAN. Photorealistic skin with natural pores and texture. Real hair strands. Real fabric with accurate material properties. Shot on a high-end camera with professional studio lighting. This is not concept art, not illustration, not 3D render.

Character: {CHARACTER_DESCRIPTION}

Output: Landscape composition, white background, full layout visible, no cropping, no text labels, no watermarks, no UI elements.`;

export function buildCharacterSheetPrompt(character: Character): string {
  return CHARACTER_SHEET_PROMPT_TEMPLATE.replace(
    "{CHARACTER_DESCRIPTION}",
    character.description
  );
}

export const FACE_IMAGE_PROMPT_TEMPLATE = `A photorealistic, high-definition close-up portrait of a single character, shot from the shoulders up, centered on the face. Pure white background. Studio lighting, soft and even, with no harsh shadows. The face must be razor-sharp and fully visible: eyes, nose, lips, jawline, skin tone, and hair all rendered with maximum detail and clarity. Front-facing, neutral expression, slight head tilt allowed. This image will be used as an AI video generation face reference — facial accuracy is the only priority.

Character: {CHARACTER_DESCRIPTION}

Requirements: portrait orientation, white background, no text, no watermark, no props, no other characters.`;

export function buildFaceImagePrompt(character: Character): string {
  return FACE_IMAGE_PROMPT_TEMPLATE.replace(
    "{CHARACTER_DESCRIPTION}",
    character.description
  );
}
