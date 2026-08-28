const BLOGS = {
    tollywoodboost: "https://tollywoodboost.blogspot.com",
    tollyboost: "https://tollyboost.blogspot.com"
};

const MAX_RESULTS = 150;

export async function onRequestGet(context) {
    const url = new URL(context.request.url);

    const blog = url.searchParams.get("blog");
    const start = Number(url.searchParams.get("start") || "1");
    const limit = Math.min(
        Number(url.searchParams.get("limit") || MAX_RESULTS),
        MAX_RESULTS
    );

    if (!BLOGS[blog]) {
        return json({
            success: false,
            error: "Invalid blog. Use tollywoodboost or tollyboost."
        }, 400);
    }

    if (!Number.isInteger(start) || start < 1) {
        return json({
            success: false,
            error: "Invalid start value."
        }, 400);
    }

    try {
        const feedUrl =
            BLOGS[blog] +
            "/feeds/posts/default" +
            "?alt=json" +
            "&start-index=" +
            start +
            "&max-results=" +
            limit;

        const response = await fetch(feedUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; FilmstarsDuplicateFinder/1.0)"
            }
        });

        if (!response.ok) {
            return json({
                success: false,
                retryable: [429, 500, 502, 503, 504]
                    .includes(response.status),
                status: response.status,
                error:
                    "Blogger returned HTTP " +
                    response.status
            }, 502);
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.toLowerCase().includes("json")) {
            return json({
                success: false,
                retryable: true,
                error: "Blogger returned non-JSON."
            }, 502);
        }

        const data = await response.json();

        const entries =
            data?.feed?.entry || [];

        const posts =
            entries.map(parsePost);

        return json({
            success: true,
            blog,
            start,
            requested: limit,
            count: posts.length,
            posts
        });

    } catch (error) {
        return json({
            success: false,
            retryable: true,
            error:
                error?.message ||
                "Blogger request failed."
        }, 503);
    }
}


/* =========================================
   PARSE POST
========================================= */

function parsePost(entry) {

    const links =
        Array.isArray(entry.link)
            ? entry.link
            : [];

    const alternate =
        links.find(
            x => x.rel === "alternate"
        );

    const title =
        entry.title?.$t || "";

    const content =
        entry.content?.$t ||
        entry.summary?.$t ||
        "";

    const published =
        entry.published?.$t || "";

    const updated =
        entry.updated?.$t || "";

    const id =
        entry.id?.$t || "";

    const images =
        extractImages(content);

    return {
        id,
        title,
        published,
        updated,
        url: alternate?.href || "",

        titleKey:
            normalizeTitle(title),

        textHash:
            simpleHash(
                normalizeText(content)
            ),

        imageKeys:
            images.map(
                normalizeImageFilename
            )
    };
}


/* =========================================
   EXTRACT IMAGES
========================================= */

function extractImages(html) {

    if (!html) {
        return [];
    }

    const results = [];

    const regex =
        /<img[^>]+(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;

    let match;

    while (
        (match = regex.exec(html)) !== null
    ) {
        const filename =
            normalizeImageFilename(
                match[1]
            );

        if (
            filename &&
            !results.includes(filename)
        ) {
            results.push(filename);
        }
    }

    return results;
}


/* =========================================
   IMAGE FILENAME NORMALIZATION
========================================= */

function normalizeImageFilename(url) {

    try {

        const clean =
            String(url)
                .split("?")[0];

        const parts =
            clean.split("/");

        let filename =
            parts[parts.length - 1] || "";

        try {
            filename =
                decodeURIComponent(filename);
        } catch {}

        try {
            filename =
                decodeURIComponent(filename);
        } catch {}

        return filename
            .toLowerCase()
            .replace(/\+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    } catch {

        return "";
    }
}


/* =========================================
   TITLE NORMALIZATION
========================================= */

function normalizeTitle(value) {

    return String(value || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================
   TEXT NORMALIZATION
========================================= */

function normalizeText(html) {

    let value =
        String(html || "");

    value =
        value.replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
        );

    value =
        value.replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
        );

    /*
     * Replace images by their filenames.
     * This removes dependency on different
     * Blogger AVvXs image IDs.
     */

    value =
        value.replace(
            /<img[^>]*>/gi,
            function(tag) {

                const match =
                    tag.match(
                        /(?:src|data-src)\s*=\s*["']([^"']+)["']/i
                    );

                if (!match) {
                    return " ";
                }

                return (
                    " " +
                    normalizeImageFilename(
                        match[1]
                    ) +
                    " "
                );
            }
        );

    value =
        value.replace(
            /<[^>]+>/g,
            " "
        );

    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================
   HASH
========================================= */

function simpleHash(value) {

    let hash = 0;

    for (
        let i = 0;
        i < value.length;
        i++
    ) {
        hash =
            ((hash << 5) - hash) +
            value.charCodeAt(i);

        hash |= 0;
    }

    return String(hash);
}


/* =========================================
   JSON
========================================= */

function json(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
