export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

export interface ImageGenerateParams {
  prompt: string;
  num_images?: number;
  aspect_ratio: string;
  output_format?: string;
  resolution?: string;
  image_urls?: string[];
  // Image-to-image editing: when set, uses the /edit endpoint
  i2i_image_url?: string;
  i2i_strength?: number; // 0–1, higher = more deviation from source (default 0.75)
}

export interface ImageProvider {
  generateImages(params: ImageGenerateParams): Promise<GeneratedImage[]>;
}

export interface VideoSubmitParams {
  prompt: string;
  reference_image_urls: string[];  // Seedance reference-to-video: 1–9 reference images
  reference_labels?: string[];     // optional label per image e.g. "character face", "scene panel"
  reference_video_urls?: string[]; // Seedance: up to 3 reference videos (@Video1~@Video3), combined 2–15s
  duration: number;                // seconds (numeric from store)
  aspect_ratio?: string;
  maxDuration: number;
  resolution?: string;             // e.g. "720p" | "480p"
  generate_audio?: boolean;
  end_user_id?: string;            // required by Seedance for compliance
}

export interface VideoSubmitResult {
  requestId: string;
  endpoint: string;
}

export type VideoStatusResult =
  | { status: "COMPLETED"; video: { url: string; width: number; height: number; duration: number; falRequestId: string } }
  | { status: "IN_QUEUE" | "IN_PROGRESS" }
  | { status: "error"; error: string };

export interface VideoProvider {
  endpoint: string;
  submitVideo(params: VideoSubmitParams): Promise<VideoSubmitResult>;
  getStatus(requestId: string): Promise<VideoStatusResult>;
}
