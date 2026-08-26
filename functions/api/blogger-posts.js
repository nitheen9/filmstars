const BLOGS = {
    tollywoodboost: "https://tollywoodboost.blogspot.com",
    tollyboost: "https://tollyboost.blogspot.com"
};

const FEED_SIZE = 150;

export async function onRequestGet(context) {

    const requestUrl = new URL(context.request.url);

    const blog = requestUrl.searchParams.get("blog");

    const start = Number(
        requestUrl.searchParams.get("start") || "1"
    );

    if (!BLOGS[blog]) {
        return json({
            success: false,
            error:
                "Invalid blog. Use tollywoodboost or tollyboost."
        }, 400);
    }

    if (!Number.isInteger(start) || start < 1) {
        return json({
            success: false,
            error: "Invalid start value."
        }, 400);
    }

    const feedUrl =
        BLOGS[blog] +
        "/feeds/posts/default" +
        "?alt=json" +
        "&start-index=" +
        start +
        "&max-results=" +
        FEED_SIZE;

    try {

        const response = await fetch(feedUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 Filmstars Duplicate Finder"
            }
        });

        if (!response.ok) {
            return json({
                success: false,
                error:
                    "Blogger returned HTTP " +
                    response.status
            }, 502);
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("json")) {

            const text = await response.text();

            return json({
                success: false,
                error:
                    "Blogger did not return JSON.",
                response:
                    text.substring(0, 300)
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
            error:
                error?.message ||
                "Unable to retrieve Blogger feed."
        }, 500);
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
        content,
        images,
        titleKey:
            normalizeTitle(title),
        textKey:
            normalizeText(content),
        imageKeys:
            images.map(
                normalizeImageFilename
            )
    };
}


/* =========================================
   IMAGE EXTRACTION
========================================= */

function extractImages(html) {

    if (!html) {
        return [];
    }

    const results = [];

    const regex =
        /<(?:img)[^>]+(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;

    let match;

    while (
        (match = regex.exec(html)) !== null
    ) {

        const original = match[1];

        const filename =
            getImageFilename(original);

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
   IMAGE FILENAME
========================================= */

function getImageFilename(url) {

    try {

        let clean =
            String(url)
                .split("?")[0];

        const parts =
            clean.split("/");

        let filename =
            parts[parts.length - 1] || "";

        filename =
            decodeURIComponent(filename);

        return filename;

    } catch {

        return String(url);
    }
}


/* =========================================
   IMAGE NORMALIZATION
========================================= */

function normalizeImageFilename(value) {

    return String(value || "")
        .toLowerCase()
        .replace(/\+/g, " ")
        .replace(/%20/g, " ")
        .replace(/%2520/g, " ")
        .replace(/%28/g, "(")
        .replace(/%29/g, ")")
        .replace(/%2528/g, "(")
        .replace(/%2529/g, ")")
        .replace(/\s+/g, " ")
        .trim();
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
     * Replace image tags with their
     * normalized filenames.
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
                    " IMAGE " +
                    normalizeImageFilename(
                        getImageFilename(
                            match[1]
                        )
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
