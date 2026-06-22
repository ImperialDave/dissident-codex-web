import Link from "next/link";
import type { Post } from "@/models";
import { PostMedia } from "./PostMedia";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";
import { timeAgo } from "@/lib/utils";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className="codex-surface codex-surface-hover block rounded-xl p-4 transition"
    >
      <div className="mb-2 flex items-center gap-3">
        <UserAvatar name={post.authorName} photoUrl={post.authorPhotoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{post.authorName}</span>
            <RoleBadge role={post.authorRole} />
          </div>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <span className="codex-chip-active rounded-full px-2 py-1 text-xs">
          {post.category}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{post.title}</h3>
      <p className="line-clamp-3 text-sm text-slate-300">{post.body}</p>
      <PostMedia url={post.imageUrl} mediaType={post.mediaType} preview />
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
      </div>
    </Link>
  );
}
