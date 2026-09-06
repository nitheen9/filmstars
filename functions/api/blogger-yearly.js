const BLOG = "https://tollyboost.blogspot.com";

const PAGE_SIZE = 150;

export async function onRequestGet(context) {
    const requestUrl = new URL(context.request.url);

    const year = Number(
        requestUrl.searchParams.get("year")
    );

    const start = Number(
        requestUrl.searchParams.get("start") || "1"
    );

    if (
        !Number.isInteger(year) ||
        year < 2010 ||
        year > 2026
    ) {
        return json(
            {
                success: false,
                error: "Year must be between 2010 and 2026."
            },
            400
        );
    }

    if (
        !Number.isInteger(start) ||
        start < 1
    ) {
        return json(
            {
                success: false,
                error: "Invalid start value."
            },
            400
        );
    }

    try {
        /*
         * Use Blogger's normal posts feed.
         *
         * We intentionally do not depend on Blogger's
         * published-min / published-max pagination because
         * Blogger can return inconsistent pagination with
         * those filters.
         */
        const cacheBust =
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2);

        const feedUrl =
            BLOG +
            "/feeds/posts/default" +
            "?alt=json" +
            "&start-index=" +
            encodeURIComponent(start) +
            "&max-results=" +
            PAGE_SIZE +
            "&_cb=" +
            encodeURIComponent(cacheBust);

        const response = await fetch(
            feedUrl,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 Filmstars Blogger Year Scanner",
                    "Cache-Control":
                        "no-cache",
                    "Pragma":
                        "no-cache"
                },
                cf: {
                    cacheTtl: 0,
                    cacheEverything: false
                }
            }
        );

        if (!response.ok) {
            return json(
                {
                    success: false,
                    retryable: [429, 500, 502, 503, 504]
                        .includes(response.status),
                    error:
                        "Blogger returned HTTP " +
                        response.status
                },
                502
            );
        }

        const contentType =
            response.headers.get("content-type") || "";

        if (
            !contentType
                .toLowerCase()
                .includes("json")
        ) {
            const text = await response.text();

            return json(
                {
                    success: false,
                    retryable: true,
                    error:
                        "Blogger returned non-JSON.",
                    response:
                        text.substring(0, 300)
                },
                502
            );
        }

        const data = await response.json();

        const entries =
            Array.isArray(data?.feed?.entry)
                ? data.feed.entry
                : [];

        const posts = entries
            .map(parsePost)
            .filter(Boolean)
            .filter(post =>
                isYearPost(post.url, year)
            );

        return json({
            success: true,
            blog: BLOG,
            year: year,
            start: start,
            feedCount: entries.length,
            count: posts.length,
            requested: PAGE_SIZE,
            posts: posts
        });
    }
    catch (error) {
        return json(
            {
                success: false,
                retryable: true,
                error:
                    error?.message ||
                    "Blogger request failed."
            },
            503
        );
    }
}


/*
=========================================================
PARSE BLOGGER POST
=========================================================
*/

function parsePost(entry) {
    const links =
        Array.isArray(entry?.link)
            ? entry.link
            : [];

    const alternate =
        links.find(
            link =>
                link?.rel === "alternate" &&
                typeof link.href === "string"
        );

    if (!alternate?.href) {
        return null;
    }

    return {
        id:
            entry?.id?.$t ||
            alternate.href,

        title:
            entry?.title?.$t ||
            "",

        published:
            entry?.published?.$t ||
            "",

        updated:
            entry?.updated?.$t ||
            "",

        url:
            alternate.href
    };
}


/*
=========================================================
CHECK EXACT BLOGGER POST URL
Example:

https://tollyboost.blogspot.com/2022/03/example-post.html

Accepted:
 /2022/01/post.html
 /2022/12/anything-here.html

Rejected:
 /2022/
 /p/about.html
 /search/label/test
=========================================================
*/

function isYearPost(url, year) {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);

        if (
            parsed.hostname.toLowerCase() !==
            "tollyboost.blogspot.com"
        ) {
            return false;
        }

        const pattern =
            new RegExp(
                "^/" +
                year +
                "/\\d{2}/.+\\.html$",
                "i"
            );

        return pattern.test(
            parsed.pathname
        );
    }
    catch {
        return false;
    }
}


/*
=========================================================
JSON RESPONSE
=========================================================
*/

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status: status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",

                "Pragma":
                    "no-cache",

                "Expires":
                    "0",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
