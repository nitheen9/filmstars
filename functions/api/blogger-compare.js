export async function onRequestGet(context) {
    const url = new URL(context.request.url);

    const blog = (url.searchParams.get("blog") || "").trim().toLowerCase();

    let start = parseInt(url.searchParams.get("start") || "1", 10);
    let limit = parseInt(url.searchParams.get("limit") || "150", 10);

    if (!Number.isFinite(start) || start < 1) {
        start = 1;
    }

    if (!Number.isFinite(limit) || limit < 1) {
        limit = 150;
    }

    // Blogger feeds work best with reasonably sized pages.
    limit = Math.min(limit, 150);

    const BLOGS = {
        mytecbook: "https://mytecbook.blogspot.com",
        mytecbooks: "https://mytecbooks.blogspot.com"
    };

    if (!Object.prototype.hasOwnProperty.call(BLOGS, blog)) {
        return jsonResponse(
            {
                success: false,
                error: "Invalid blog. Use mytecbook or mytecbooks."
            },
            400
        );
    }

    const blogUrl = BLOGS[blog];

    const feedUrl =
        blogUrl +
        "/feeds/posts/default" +
        "?alt=json" +
        "&start-index=" +
        encodeURIComponent(start) +
        "&max-results=" +
        encodeURIComponent(limit);

    let lastError = null;

    // Retry temporary Blogger / network errors.
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const response = await fetch(feedUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json, text/javascript, */*",
                    "User-Agent": "Mozilla/5.0 BloggerArchiveScanner"
                },
                cf: {
                    cacheTtl: 0,
                    cacheEverything: false
                }
            });

            const contentType =
                response.headers.get("content-type") || "";

            const body = await response.text();

            if (!response.ok) {
                lastError = new Error(
                    "Blogger HTTP " + response.status
                );

                if (
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504
                ) {
                    await sleep(1500 * attempt);
                    continue;
                }

                return jsonResponse(
                    {
                        success: false,
                        error:
                            "Blogger returned HTTP " +
                            response.status
                    },
                    502
                );
            }

            if (
                !contentType.toLowerCase().includes("json") &&
                !body.trim().startsWith("{")
            ) {
                lastError = new Error(
                    "Blogger returned non-JSON content."
                );

                await sleep(1500 * attempt);
                continue;
            }

            let data;

            try {
                data = JSON.parse(body);
            } catch (error) {
                lastError = new Error(
                    "Unable to parse Blogger JSON."
                );

                await sleep(1500 * attempt);
                continue;
            }

            const entries =
                data &&
                data.feed &&
                Array.isArray(data.feed.entry)
                    ? data.feed.entry
                    : [];

            const posts = entries.map(function (entry, index) {
                return normalizePost(
                    entry,
                    start + index
                );
            });

            return jsonResponse(
                {
                    success: true,
                    blog: blog,
                    start: start,
                    requested: limit,
                    returned: posts.length,
                    totalResults:
                        getFeedNumber(
                            data,
                            "openSearch$totalResults"
                        ),
                    startIndex:
                        getFeedNumber(
                            data,
                            "openSearch$startIndex"
                        ),
                    itemsPerPage:
                        getFeedNumber(
                            data,
                            "openSearch$itemsPerPage"
                        ),
                    posts: posts
                },
                200
            );
        } catch (error) {
            lastError = error;

            await sleep(1500 * attempt);
        }
    }

    return jsonResponse(
        {
            success: false,
            error:
                "Temporary Blogger error after 5 attempts.",
            detail:
                lastError && lastError.message
                    ? lastError.message
                    : "Unknown error"
        },
        503
    );
}


/* -------------------------------------------------------
   Normalize Blogger entry
------------------------------------------------------- */

function normalizePost(entry, fallbackNumber) {
    const id = getText(entry && entry.id);

    const title =
        getText(entry && entry.title) ||
        "Untitled";

    const published =
        getText(entry && entry.published) ||
        getText(entry && entry.updated) ||
        "";

    const updated =
        getText(entry && entry.updated) ||
        published;

    const url = getPostUrl(entry);

    const content =
        getText(entry && entry.content) ||
        getText(entry && entry.summary) ||
        "";

    const imageUrls = extractImageUrls(entry, content);

    return {
        id:
            id ||
            url ||
            "post-" + fallbackNumber,

        title: title,

        url: url,

        published: published,

        updated: updated,

        date: published || updated,

        content: content,

        imageUrls: imageUrls
    };
}


/* -------------------------------------------------------
   Get Blogger post URL
------------------------------------------------------- */

function getPostUrl(entry) {
    if (!entry || !Array.isArray(entry.link)) {
        return "";
    }

    const alternate = entry.link.find(function (link) {
        return link &&
            link.rel === "alternate" &&
            link.href;
    });

    if (alternate) {
        return alternate.href;
    }

    const first = entry.link.find(function (link) {
        return link && link.href;
    });

    return first ? first.href : "";
}


/* -------------------------------------------------------
   Extract images
------------------------------------------------------- */

function extractImageUrls(entry, content) {
    const urls = [];

    function add(url) {
        if (!url) {
            return;
        }

        url = String(url).trim();

        if (!url) {
            return;
        }

        if (
            !url.startsWith("http://") &&
            !url.startsWith("https://")
        ) {
            return;
        }

        if (!urls.includes(url)) {
            urls.push(url);
        }
    }

    // Blogger media thumbnail.
    if (
        entry &&
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {
        add(entry.media$thumbnail.url);
    }

    // Blogger media content.
    if (
        entry &&
        entry.media$content &&
        Array.isArray(entry.media$content)
    ) {
        entry.media$content.forEach(function (item) {
            if (item && item.url) {
                add(item.url);
            }
        });
    }

    // Extract image URLs from HTML content.
    if (content) {
        const regex =
            /<img[^>]+src=["']([^"']+)["']/gi;

        let match;

        while ((match = regex.exec(content)) !== null) {
            add(match[1]);

            if (urls.length >= 50) {
                break;
            }
        }
    }

    return urls;
}


/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function getText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "object" && value.$t) {
        return String(value.$t);
    }

    return "";
}


function getFeedNumber(data, property) {
    try {
        const value =
            data.feed &&
            data.feed[property] &&
            data.feed[property].$t;

        const number = parseInt(value, 10);

        return Number.isFinite(number)
            ? number
            : null;
    } catch (error) {
        return null;
    }
}


function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}


function jsonResponse(data, status) {
    return new Response(
        JSON.stringify(data),
        {
            status: status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",

                "Pragma": "no-cache",

                "Access-Control-Allow-Origin": "*",

                "Access-Control-Allow-Methods":
                    "GET, OPTIONS",

                "Access-Control-Allow-Headers":
                    "Content-Type"
            }
        }
    );
}


export function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }
    });
}
