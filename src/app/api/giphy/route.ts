import { NextRequest, NextResponse } from "next/server";

const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

function giphyApiKey(): string | null {
  return (
    process.env.GIPHY_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ||
    null
  );
}

function parseGiphyPayload(data: unknown) {
  if (!data || typeof data !== "object") return [];
  const record = data as {
    data?: Array<{
      id?: string;
      images?: Record<string, { url?: string }>;
    }>;
  };

  return (record.data ?? [])
    .map((obj) => {
      const images = obj.images ?? {};
      const fixed = images.fixed_height ?? images.downsized ?? {};
      const preview = images.preview_gif ?? images.fixed_height_small ?? fixed;
      const fullUrl = fixed.url ?? "";
      const previewUrl = preview.url ?? fullUrl;
      return {
        id: obj.id ?? "",
        fullUrl: fullUrl.startsWith("//") ? `https:${fullUrl}` : fullUrl,
        previewUrl: previewUrl.startsWith("//") ? `https:${previewUrl}` : previewUrl,
      };
    })
    .filter((gif) => gif.id && gif.fullUrl);
}

export async function GET(request: NextRequest) {
  const apiKey = giphyApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GIF search is not configured on the server." },
      { status: 503 }
    );
  }

  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 24), 1),
    50
  );

  const endpoint = query
    ? `${GIPHY_BASE}/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg-13`
    : `${GIPHY_BASE}/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=pg-13`;

  try {
    const response = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!response.ok) {
      return NextResponse.json(
        { error: "GIF search is temporarily unavailable." },
        { status: 502 }
      );
    }

    const body = await response.json();
    return NextResponse.json({ items: parseGiphyPayload(body) });
  } catch {
    return NextResponse.json({ error: "GIF search is temporarily unavailable." }, { status: 502 });
  }
}