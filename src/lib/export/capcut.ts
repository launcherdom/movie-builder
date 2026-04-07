import { nanoid } from "nanoid";
import type { Story, AspectRatio } from "@/types/movie";

// CapCut draft JSON format (simplified, compatible with CapCut 3.x)
// Reference: https://github.com/topics/capcut-draft

const FPS = 30;
const US_PER_SECOND = 1_000_000; // CapCut uses microseconds

function secondsToUs(s: number): number {
  return Math.round(s * US_PER_SECOND);
}

interface CapcutMaterial {
  id: string;
  type: "video" | "photo";
  path: string; // local filename within the draft
  duration: number; // microseconds
  width: number;
  height: number;
  name: string;
}

interface CapcutSegment {
  id: string;
  material_id: string;
  target_timerange: { start: number; duration: number };
  source_timerange: { start: number; duration: number };
  speed: number;
  volume: number;
}

export interface CapcutDraftJson {
  draft_content: object;
  draft_meta_info: object;
  /** map of filename → download URL (caller must fetch and include in ZIP) */
  assets: Record<string, string>;
}

export function buildCapcutDraft(story: Story, aspectRatio: AspectRatio): CapcutDraftJson {
  const draftId = nanoid();
  const now = Math.floor(Date.now() / 1000);

  const [canvasW, canvasH] =
    aspectRatio === "9:16" ? [1080, 1920] : [1920, 1080];

  const materials: CapcutMaterial[] = [];
  const segments: CapcutSegment[] = [];
  const assets: Record<string, string> = {};

  let timelineCursor = 0;

  // Flatten all shots and build materials + segments
  for (const scene of story.scenes) {
    for (const shot of scene.shots) {
      const durationUs = secondsToUs(shot.duration);
      const hasVideo = !!shot.videoClip?.url;
      const hasImage = !!shot.storyboardPanel?.url || !!shot.keyframeImage?.url;

      if (!hasVideo && !hasImage) continue;

      const matId = nanoid();
      const filename = hasVideo
        ? `clip_${shot.id}.mp4`
        : `panel_${shot.id}.png`;

      const assetUrl = hasVideo
        ? shot.videoClip!.url
        : (shot.keyframeImage?.url ?? shot.storyboardPanel!.url);

      const sourceW = hasVideo
        ? (shot.videoClip!.width || canvasW)
        : (shot.keyframeImage?.width || shot.storyboardPanel?.width || canvasW);
      const sourceH = hasVideo
        ? (shot.videoClip!.height || canvasH)
        : (shot.keyframeImage?.height || shot.storyboardPanel?.height || canvasH);

      assets[filename] = assetUrl;

      materials.push({
        id: matId,
        type: hasVideo ? "video" : "photo",
        path: filename,
        duration: durationUs,
        width: sourceW,
        height: sourceH,
        name: `${scene.heading} — ${shot.shotType}`,
      });

      segments.push({
        id: nanoid(),
        material_id: matId,
        target_timerange: { start: timelineCursor, duration: durationUs },
        source_timerange: { start: 0, duration: durationUs },
        speed: 1.0,
        volume: 1.0,
      });

      timelineCursor += durationUs;
    }
  }

  const totalDurationUs = timelineCursor;

  const draft_content = {
    canvas_config: {
      height: canvasH,
      width: canvasW,
      ratio: aspectRatio,
    },
    duration: totalDurationUs,
    fps: FPS,
    id: draftId,
    materials: {
      videos: materials.map((m) => ({
        id: m.id,
        type: m.type,
        path: m.path,
        duration: m.duration,
        width: m.width,
        height: m.height,
        name: m.name,
        category_id: "",
        category_name: "local",
        has_audio: false,
        height_: m.height,
        width_: m.width,
      })),
    },
    tracks: [
      {
        attribute: 0,
        flag: 0,
        id: nanoid(),
        is_default_name: true,
        name: "",
        segments: segments.map((seg) => ({
          id: seg.id,
          material_id: seg.material_id,
          target_timerange: seg.target_timerange,
          source_timerange: seg.source_timerange,
          speed: seg.speed,
          volume: seg.volume,
          extra_material_refs: [],
          cartoon: false,
          clip: {
            alpha: 1.0,
            flip: { horizontal: false, vertical: false },
            rotation: 0.0,
            scale: { x: 1.0, y: 1.0 },
            translation: { x: 0.0, y: 0.0 },
          },
          enable_adjust: true,
          enable_color_curves: true,
          enable_color_wheels: true,
          enable_lut: true,
          enable_smart_color_adjust: false,
          hdr_settings: { intensity: 1.0, mode: 1, nits: 1000 },
          intensifies_audio: false,
          is_placeholder: false,
          is_tone_modify: false,
          last_nonzero_volume: 1.0,
          render_index: 0,
          responsive_layout: {
            enable: false,
            horizontal_pos_layout: 0,
            size_layout: 0,
            target_follow: "",
            vertical_pos_layout: 0,
          },
          reverse: false,
          selected_loudness_preset: "",
          template_id: "",
          template_scene: "default",
          track_attribute: 0,
          track_render_index: 0,
          uniform_scale: { on: true, value: 1.0 },
          visible: true,
        })),
        type: "video",
      },
    ],
    version: "3.0.0",
  };

  const draft_meta_info = {
    draft_cloud_last_action_download: false,
    draft_cloud_purchase_info: "",
    draft_cloud_template_id: "",
    draft_cloud_tutorial_info: "",
    draft_cloud_videocut_purchase_info: "",
    draft_cover: "",
    draft_fold_path: "",
    draft_id: draftId,
    draft_is_article_video_draft: false,
    draft_is_from_deeplink: "",
    draft_is_invisible: false,
    draft_materials: [],
    draft_name: story.title,
    draft_need_rename_folder: false,
    draft_new_version: "",
    draft_removable_storage_device: false,
    draft_root_path: "",
    draft_segment_extra_info: [],
    draft_timeline_musics_path: [],
    tm_draft_cloud_completed: "",
    tm_draft_cloud_modified: 0,
    tm_draft_create: now,
    tm_draft_modified: now,
    tm_duration: totalDurationUs,
  };

  return { draft_content, draft_meta_info, assets };
}
