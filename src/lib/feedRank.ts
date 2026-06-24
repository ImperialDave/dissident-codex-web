import { FEED_FAVORITE_POSTS_LIMIT } from "@/lib/constants";
import type { Post } from "@/models";

function postTimestamp(post: Post): number {
  return post.createdAt?.seconds ?? 0;
}

function sortByCreatedAtDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => postTimestamp(b) - postTimestamp(a));
}

export function partitionFeedPosts(
  posts: Post[],
  favoriteTopicNames: Set<string>,
  favoriteLimit = FEED_FAVORITE_POSTS_LIMIT
): { favoritePosts: Post[]; allPosts: Post[] } {
  if (favoriteTopicNames.size === 0) {
    return { favoritePosts: [], allPosts: sortByCreatedAtDesc(posts) };
  }

  const favoritePosts: Post[] = [];
  const favoriteIds = new Set<string>();

  for (const post of sortByCreatedAtDesc(posts)) {
    if (favoritePosts.length >= favoriteLimit) break;
    if (favoriteTopicNames.has(post.category.toLowerCase())) {
      favoritePosts.push(post);
      favoriteIds.add(post.id);
    }
  }

  const allPosts = sortByCreatedAtDesc(posts).filter((p) => !favoriteIds.has(p.id));
  return { favoritePosts, allPosts };
}
