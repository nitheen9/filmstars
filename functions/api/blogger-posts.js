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
            error: "Invalid blog."
        }, 400);
    }

    if (!Number.isInteger(start) || start < 1) {
        return json({
            success: false,
            error: "Invalid start."
        }, 400);
    }

    try {
        const feedUrl =
            BLOGS[blog] +
            "/feeds/posts/default" +
            "?alt=json" +
            "&start-index=" + start +
            "&max-results=" + limit;

        const response = await fetch(feedUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 Filmstars Blogger Duplicate Finder"
            }
        });

        if (!response.ok) {
            return json({
                success: false,
                retryable: [429, 500, 502, 503, 504]
                    .includes(response.status),
                error:
                    "Blogger returned HTTP " +
                    response.status
            }, 502);
        }

        const type =
            response.headers.get("content-type") || "";

        if (!type.toLowerCase().includes("json")) {
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
        extractImageNames(content);

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
            images
    };
}


/* =========================================
   IMAGE FILENAMES
========================================= */

function extractImageNames(html) {

    if (!html) {
        return [];
    }

    const result = [];

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
            !result.includes(filename)
        ) {
            result.push(filename);
        }
    }

    return result;
}


function normalizeImageFilename(url) {
    try {
        const clean =
            String(url)
                .split("?")[0];

        const pieces =
            clean.split("/");

        let name =
            pieces[pieces.length - 1] || "";

        name =
            decodeURIComponent(name);

        /*
         * A second decode handles filenames
         * that Blogger encoded twice.
         */

        try {
            name =
                decodeURIComponent(name);
        } catch {}

        return name
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
     * Replace images with their filenames
     * so different Blogger AVvXs IDs do not
     * make otherwise identical posts different.
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

    /*
     * Remove HTML.
     */

    value =
        value.replace(
            /<[^>]+>/g,
            " "
        );

    /*
     * Decode common entities.
     */

    value =
        value
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'");

    return value
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================
   SIMPLE HASH
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
   JSON RESPONSE
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
