import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

export interface GifResult {
  id: string;
  previewUrl: string;
  fullUrl: string;
}

export async function searchGiphy(query: string, limit = 24): Promise<GifResult[]> {
  const fn = httpsCallable(getFirebaseFunctions(), "searchGiphy");
  const result = await fn({ query, limit });
  const data = result.data as { gifs?: GifResult[] };
  return data.gifs || [];
}