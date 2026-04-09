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
}

export interface ImageProvider {
  generateImages(params: ImageGenerateParams): Promise<GeneratedImage[]>;
}

export interface VideoSubmitParams {
  prompt: string;
  image_url: string;
  duration: number;       // seconds (numeric from store)
  aspect_ratio?: string;
  maxDuration: number;
  resolution?: string;    // e.g. "720p" | "480p"
  generate_audio?: boolean;
  end_user_id?: string;   // required by some providers (e.g. Seedance) for compliance
  end_image_url?: string; // Seedance 2.0: last frame target for smooth shot transitions
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
