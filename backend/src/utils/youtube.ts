const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeVideoId(input: string): string {
  if (YOUTUBE_ID_REGEX.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      if (YOUTUBE_ID_REGEX.test(id)) return id;
    }

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id && YOUTUBE_ID_REGEX.test(id)) return id;
      const parts = url.pathname.split("/").filter(Boolean);
      const embeddedId = parts.at(-1);
      if (embeddedId && YOUTUBE_ID_REGEX.test(embeddedId)) return embeddedId;
    }
  } catch {
    throw new Error("Invalid YouTube URL or video ID");
  }

  throw new Error("Invalid YouTube URL or video ID");
}

export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
