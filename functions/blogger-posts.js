const BLOGGER_FEED =
  "https://tollywoodboost.blogspot.com/feeds/posts/default?alt=json&max-results=20";

export async function onRequestGet() {
  try {
    const response = await fetch(BLOGGER_FEED, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: "Unable to fetch Blogger feed."
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const data = await response.json();

    const entries =
      data &&
      data.feed &&
      data.feed.entry
        ? data.feed.entry
        : [];

    const posts = entries.map((entry) => {
      const title =
        entry.title && entry.title.$t
          ? entry.title.$t
          : "Untitled Post";

      const published =
        entry.published && entry.published.$t
          ? entry.published.$t
          : "";

      const updated =
        entry.updated && entry.updated.$t
          ? entry.updated.$t
          : published;

      let url = "";

      if (Array.isArray(entry.link)) {
        const alternate = entry.link.find(
          (link) => link.rel === "alternate"
        );

        if (alternate && alternate.href) {
          url = alternate.href;
        }
      }

      let content = "";

      if (entry.content && entry.content.$t) {
        content = entry.content.$t;
      } else if (entry.summary && entry.summary.$t) {
        content = entry.summary.$t;
      }

      let image = "";

      /*
       * Blogger normally provides media$thumbnail
       */
      if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
      ) {
        image = entry.media$thumbnail.url;
      }

      /*
       * If Blogger does not provide media$thumbnail,
       * try to find the first image inside the post HTML.
       */
      if (!image && content) {
        const imageMatch = content.match(
          /<img[^>]+src=["']([^"']+)["']/i
        );

        if (imageMatch && imageMatch[1]) {
          image = imageMatch[1];
        }
      }

      /*
       * Remove HTML to create a clean excerpt.
       */
      const text = content
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();

      const excerpt =
        text.length > 220
          ? text.substring(0, 220).trim() + "..."
          : text;

      return {
        title,
        url,
        published,
        updated,
        image,
        excerpt
      };
    });

    return Response.json(
      {
        success: true,
        blog: "Tollywood Boost",
        source: "https://tollywoodboost.blogspot.com/",
        count: posts.length,
        posts
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300"
        }
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Server error while loading Blogger posts."
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
