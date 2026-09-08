// functions/api/mytecbook-posts.js

const BLOGS = {
    mytecbook: "https://mytecbook.blogspot.com",
    mytecbooks: "https://mytecbooks.blogspot.com"
};

const MAX_LIMIT = 150;
const MAX_RETRIES = 5;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getAlternateUrl(entry) {
    const links = entry?.link || [];

    const alternate = links.find(
        link => link.rel === "alternate" && link.href
    );

    return alternate?.href || "";
}

function cleanHtml(html) {
    if (!html) return "";

    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function extractImagesFromHtml(html) {
    if (!html) return [];

    const images = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {
        if (match[1]) {
            images.push(match[1]);
        }
    }

    return images;
}

function normalizeImageUrl(url) {
    if (!url) return "";

    return url
        .replace(/\/s72-c\//gi, "/s1600/")
        .replace(/\/s72\//gi, "/s1600/")
        .replace(/\/w72-h72-p-k-no-nu\//gi, "/s1600/")
        .replace(/\/s\d+(-c)?\//gi, "/s1600/");
}

function extractImageUrls(entry) {
    const images = [];

    if (entry?.media$thumbnail?.url) {
        images.push(entry.media$thumbnail.url);
    }

    if (Array.isArray(entry?.media$content)) {
        for (const media of entry.media$content) {
            if (media?.url) {
                images.push(media.url);
            }
        }
    }

    const html =
        entry?.content?.$t ||
        entry?.content ||
        "";

    images.push(...extractImagesFromHtml(html));

    return [
        ...new Set(
            images
                .filter(Boolean)
                .map(normalizeImageUrl)
        )
    ];
}

function normalizePost(entry) {
    const title =
        entry?.title?.$t ||
        entry?.title ||
        "";

    const published =
        entry?.published?.$t ||
        entry?.published ||
        "";

    const updated =
        entry?.updated?.$t ||
        entry?.updated ||
        "";

    const content =
        entry?.content?.$t ||
        entry?.content ||
        "";

    return {
        id:
            entry?.id?.$t ||
            entry?.id ||
            "",

        title: title.trim(),

        url: getAlternateUrl(entry),

        published,

        updated,

        date:
            published ||
            updated ||
            "",

        content,

        text: cleanHtml(content),

        imageUrls:
            extractImageUrls(entry)
    };
}

async function fetchWithRetry(url) {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

            const text =
                await response.text();

            if (
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504
            ) {

                lastError =
                    new Error(
                        `Blogger returned HTTP ${response.status}`
                    );

                if (
                    attempt < MAX_RETRIES
                ) {
                    await sleep(
                        attempt * 1500
                    );
                    continue;
                }

                throw lastError;
            }

            if (!response.ok) {

                throw new Error(
                    `Blogger returned HTTP ${response.status}`
                );

            }

            const trimmed =
                text.trim();

            if (
                !trimmed.startsWith("{") &&
                !trimmed.startsWith("[")
            ) {

                lastError =
                    new Error(
                        "Blogger returned a non-JSON response."
                    );

                if (
                    attempt < MAX_RETRIES
                ) {

                    await sleep(
                        attempt * 1500
                    );

                    continue;
                }

                throw lastError;
            }

            try {

                return JSON.parse(text);

            } catch {

                lastError =
                    new Error(
                        "Unable to parse Blogger JSON response."
                    );

                if (
                    attempt < MAX_RETRIES
                ) {

                    await sleep(
                        attempt * 1500
                    );

                    continue;
                }

                throw lastError;
            }

        } catch (error) {

            lastError = error;

            if (
                attempt < MAX_RETRIES
            ) {

                await sleep(
                    attempt * 1500
                );

            }

        }

    }

    throw (
        lastError ||
        new Error(
            "Blogger request failed."
        )
    );
}

export async function onRequestGet(context) {

    try {

        const requestUrl =
            new URL(
                context.request.url
            );

        const blog =
            (
                requestUrl.searchParams.get(
                    "blog"
                ) || ""
            )
                .trim()
                .toLowerCase();

        const startRaw =
            parseInt(
                requestUrl.searchParams.get(
                    "start"
                ) || "1",
                10
            );

        const limitRaw =
            parseInt(
                requestUrl.searchParams.get(
                    "limit"
                ) || "150",
                10
            );

        if (!BLOGS[blog]) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid blog. Use mytecbook or mytecbooks."
                },
                {
                    status: 400,
                    headers: {
                        "Access-Control-Allow-Origin":
                            "*"
                    }
                }
            );

        }

        const start =
            Number.isFinite(startRaw) &&
            startRaw > 0
                ? startRaw
                : 1;

        const limit =
            Number.isFinite(limitRaw) &&
            limitRaw > 0
                ? Math.min(
                    limitRaw,
                    MAX_LIMIT
                )
                : MAX_LIMIT;

        const feedUrl =
            `${BLOGS[blog]}/feeds/posts/default` +
            `?alt=json` +
            `&start-index=${start}` +
            `&max-results=${limit}`;

        const data =
            await fetchWithRetry(
                feedUrl
            );

        const feed =
            data?.feed || {};

        const entries =
            Array.isArray(feed.entry)
                ? feed.entry
                : [];

        const posts =
            entries.map(
                normalizePost
            );

        const totalResults =
            parseInt(
                feed?.openSearch$totalResults?.$t ||
                "0",
                10
            ) || 0;

        const startIndex =
            parseInt(
                feed?.openSearch$startIndex?.$t ||
                String(start),
                10
            ) || start;

        const itemsPerPage =
            parseInt(
                feed?.openSearch$itemsPerPage?.$t ||
                String(posts.length),
                10
            ) || posts.length;

        return Response.json(
            {
                success: true,

                blog,

                start,

                requested: limit,

                returned:
                    posts.length,

                totalResults,

                startIndex,

                itemsPerPage,

                posts
            },
            {
                headers: {
                    "Access-Control-Allow-Origin":
                        "*",

                    "Cache-Control":
                        "public, max-age=60"
                }
            }
        );

    } catch (error) {

        return Response.json(
            {
                success: false,

                error:
                    error?.message ||
                    "Unable to load Blogger posts."
            },
            {
                status: 500,

                headers: {
                    "Access-Control-Allow-Origin":
                        "*"
                }
            }
        );

    }
}

export async function onRequestOptions() {

    return new Response(
        null,
        {
            status: 204,

            headers: {
                "Access-Control-Allow-Origin":
                    "*",

                "Access-Control-Allow-Methods":
                    "GET, OPTIONS",

                "Access-Control-Allow-Headers":
                    "Content-Type"
            }
        }
    );

}
