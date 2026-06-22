"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GifPicker } from "@/components/GifPicker";
import { MAX_BODY, MAX_TITLE } from "@/lib/constants";
import { getCreateCategoryNames, resolveOrCreateCategory } from "@/services/categoryService";
import { uploadImage } from "@/services/mediaService";
import { createPost } from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import { canPost } from "@/models";
import { resolveRole, safeLocalStorage } from "@/lib/utils";

type Draft = {
  title: string;
  body: string;
  category: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const { user, firebaseUser } = useAuthStore();
  const draftKey = useMemo(
    () => `codex_post_draft_${firebaseUser?.uid || "anon"}`,
    [firebaseUser?.uid]
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General Discussion");
  const [categories, setCategories] = useState<string[]>(["General Discussion"]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState<string | null>(null);
  const [remoteMediaType, setRemoteMediaType] = useState<string | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    getCreateCategoryNames().then((cats) => {
      const list = cats.length ? cats : ["General Discussion"];
      setCategories(list);
      setCategory((current) => (list.includes(current) ? current : list[0]!));
    });
  }, []);

  useEffect(() => {
    const draft = safeLocalStorage.getItem(draftKey);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft) as Draft;
      setTitle(parsed.title || "");
      setBody(parsed.body || "");
      if (parsed.category) setCategory(parsed.category);
    } catch {
      // ignore
    }
  }, [draftKey]);

  useEffect(() => {
    safeLocalStorage.setItem(draftKey, JSON.stringify({ title, body, category }));
  }, [draftKey, title, body, category]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function clearMedia() {
    setImageFile(null);
    setRemoteImageUrl(null);
    setRemoteMediaType(null);
  }

  function handleImagePick(file: File | null) {
    clearMedia();
    if (!file) return;
    setImageFile(file);
  }

  if (user && !canPost(resolveRole(user, firebaseUser?.email))) {
    return <p className="text-orange-300">Your account cannot create posts right now.</p>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setError("Category is required");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = remoteImageUrl;
      let mediaType = remoteMediaType;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, "post_images");
        mediaType = imageFile.type === "image/gif" ? "gif" : "image";
      }

      const post = await createPost(title, body, trimmedCategory, imageUrl, mediaType);

      try {
        await resolveOrCreateCategory(trimmedCategory);
      } catch {
        // post already published
      }

      safeLocalStorage.removeItem(draftKey);
      clearMedia();
      setTitle("");
      setBody("");
      setSuccess("Post published!");
      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } finally {
      setLoading(false);
    }
  }

  const previewMedia = imagePreview || remoteImageUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Create Post</h1>
        <button
          type="button"
          onClick={() => router.push("/feed")}
          className="text-sm text-slate-400 hover:text-white"
        >
          Back to feed
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-[var(--color-surface)] p-5">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title"
            maxLength={MAX_TITLE}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--color-accent)]"
            required
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {title.length}/{MAX_TITLE}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={8}
            maxLength={MAX_BODY}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--color-accent)]"
            required
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {body.length}/{MAX_BODY}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="create-category-suggestions"
            placeholder="e.g. General Discussion"
            maxLength={40}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--color-accent)]"
            required
          />
          <datalist id="create-category-suggestions">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.slice(0, 8).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs ${
                  category === c
                    ? "bg-[var(--color-accent)] text-black"
                    : "border border-white/10 text-slate-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-white/10 bg-black/10 p-4">
          <p className="text-sm text-slate-300">Media (optional)</p>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagePick(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                clearMedia();
                setGifPickerOpen(true);
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Add GIF
            </button>
            {previewMedia && (
              <button
                type="button"
                onClick={clearMedia}
                className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
              >
                Remove media
              </button>
            )}
          </div>

          {previewMedia && (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <img
                src={previewMedia}
                alt="Post preview"
                className="max-h-64 w-full object-contain bg-black/30"
              />
            </div>
          )}
        </div>

        {error && (
          <p ref={errorRef} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && <p className="text-emerald-400">{success}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-accent)] px-6 py-2 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish"}
          </button>
          <button
            type="button"
            onClick={() => {
              safeLocalStorage.removeItem(draftKey);
              setTitle("");
              setBody("");
              setCategory(categories[0] || "General Discussion");
              clearMedia();
            }}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Discard draft
          </button>
        </div>
      </form>

      <GifPicker
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={(gif) => {
          clearMedia();
          setRemoteImageUrl(gif.fullUrl);
          setRemoteMediaType("gif");
        }}
      />
    </div>
  );
}
