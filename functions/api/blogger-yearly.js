const BLOG =
    "https://tollyboost.blogspot.com";

const PAGE_SIZE = 150;

const MAX_RETRIES = 5;

const REQUEST_DELAY = 1800;


export async function onRequestGet(context) {

    const requestUrl =
        new URL(
            context.request.url
        );

    const year =
        Number(
            requestUrl.searchParams.get("year")
        );

    const start =
        Number(
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
                error:
                    "Year must be between 2010 and 2026."
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
                error:
                    "Invalid start value."
            },
            400
        );
    }


    try {

        const cacheBust =
            Date.now().toString() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2);


        /*
         * Blogger feed filtered by published date.
         *
         * This requests only the selected
         * calendar year.
         */

        const feedUrl =
            BLOG +
            "/feeds/posts/default" +
            "?alt=json" +
            "&start-index=" +
            start +
            "&max-results=" +
            PAGE_SIZE +
            "&published-min=" +
            `${year}-01-01T00:00:00+05:30` +
            "&published-max=" +
            `${year + 1}-01-01T00:00:00+05:30` +
            "&_cb=" +
            encodeURIComponent(
                cacheBust
            );


        const response =
            await fetch(
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


        if (
            !response.ok
        ) {

            return json(
                {
                    success: false,
                    retryable:
                        [429,500,502,503,504]
                            .includes(
                                response.status
                            ),
                    error:
                        "Blogger returned HTTP " +
                        response.status
                },
                502
            );
        }


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType
                .toLowerCase()
                .includes(
                    "json"
                )
        ) {

            const text =
                await response.text();


            return json(
                {
                    success: false,
                    error:
                        "Blogger returned non-JSON.",
                    response:
                        text.substring(
                            0,
                            300
                        )
                },
                502
            );
        }


        const data =
            await response.json();


        const entries =
            data?.feed?.entry || [];


        const posts =
            entries
                .map(
                    parsePost
                )
                .filter(
                    post =>
                        isYearPost(
                            post.url,
                            year
                        )
                );


        return json(
            {
                success: true,
                blog: BLOG,
                year,
                start,
                count:
                    posts.length,
                requested:
                    PAGE_SIZE,
                posts
            }
        );

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


/* =========================================================
   PARSE
========================================================= */

function parsePost(
    entry
) {

    const links =
        Array.isArray(
            entry.link
        )
            ? entry.link
            : [];


    const alternate =
        links.find(
            link =>
                link.rel ===
                "alternate"
        );


    return {

        id:
            entry.id?.$t ||
            "",

        title:
            entry.title?.$t ||
            "",

        published:
            entry.published?.$t ||
            "",

        updated:
            entry.updated?.$t ||
            "",

        url:
            alternate?.href ||
            ""
    };
}


/* =========================================================
   YEAR URL CHECK
========================================================= */

function isYearPost(
    url,
    year
) {

    if (!url) {
        return false;
    }


    try {

        const parsed =
            new URL(
                url
            );


        if (
            parsed.hostname
                .toLowerCase() !==
            "tollyboost.blogspot.com"
        ) {

            return false;
        }


        /*
         * Exact Blogger post structure:
         *
         * /2022/01/post-name.html
         */

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


/* =========================================================
   JSON
========================================================= */

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(
            data
        ),
        {
            status,

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
