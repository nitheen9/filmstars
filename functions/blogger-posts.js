const BLOG_URL = "https://tollywoodboost.blogspot.com";
const BLOG_FEED = "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// TEXT
// ============================================================

function getText(value) {
    return value && value.$t ? value.$t : "";
}


// ============================================================
// ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (!Array.isArray(entry.link)) {
        return "";
    }

    const link = entry.link.find(
        item => item.rel === "alternate"
    );

    return link ? link.href : "";
}


// ============================================================
// FILMSTARS URL
// ============================================================

function convertToFilmstarsUrl(bloggerUrl) {

    if (!bloggerUrl) {
        return "";
    }

    try {

        const url = new URL(bloggerUrl);

        const match = url.pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );

        if (!match) {
            return "";
        }

        return `/${match[1]}/${match[2]}/${match[3]}.html`;

    } catch {

        return "";
    }
}


// ============================================================
// IMAGE URL
// ============================================================

function upgradeImageUrl(url, size = "s1600") {

    if (!url) {
        return "";
    }

    return url
        .replace(/\/s72-c\//g, `/${size}/`)
        .replace(/\/s72\//g, `/${size}/`)
        .replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            `/${size}/`
        )
        .replace(
            /\/s\d+\//g,
            `/${size}/`
        );
}


// ============================================================
// GET IMAGE
// ============================================================

function getPostImage(entry, content) {

    if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            "s1600"
        );
    }


    if (content) {

        let match = content.match(
            /data-src=["']([^"']+)["']/i
        );

        if (match) {
            return upgradeImageUrl(
                match[1],
                "s1600"
            );
        }


        match = content.match(
            /<img[^>]+src=["']([^"']+)["']/i
        );

        if (match) {
            return upgradeImageUrl(
                match[1],
                "s1600"
            );
        }
    }

    return "";
}


// ============================================================
// LABELS
// ============================================================

function getLabels(entry) {

    if (!Array.isArray(entry.category)) {
        return [];
    }

    return entry.category
        .map(category => category.term || "")
        .filter(Boolean);
}


// ============================================================
// CREATE POST
// ============================================================

function createPost(entry) {

    const content =
        getText(entry.content) ||
        getText(entry.summary);

    const bloggerUrl =
        getAlternateUrl(entry);

    return {

        title:
            getText(entry.title),

        url:
            convertToFilmstarsUrl(
                bloggerUrl
            ),

        bloggerUrl:
            bloggerUrl,

        published:
            getText(entry.published),

        updated:
            getText(entry.updated),

        image:
            getPostImage(
                entry,
                content
            ),

        content:
            content,

        labels:
            getLabels(entry)
    };
}


// ============================================================
// FETCH BLOGGER
// ============================================================

async function fetchBlogger(
    startIndex,
    maxResults,
    label
) {

    let feedUrl = BLOG_FEED;

    /*
     * IMPORTANT:
     *
     * No label:
     * /feeds/posts/default
     *
     * Label:
     * /feeds/posts/default/-/Label Name
     */

    if (label) {

        feedUrl =
            BLOG_FEED +
            "/-/" +
            encodeURIComponent(label);
    }


    const url =
        new URL(feedUrl);

    url.searchParams.set(
        "alt",
        "json"
    );

    url.searchParams.set(
        "start-index",
        String(startIndex)
    );

    url.searchParams.set(
        "max-results",
        String(maxResults)
    );


    const response =
        await fetch(
            url.toString(),
            {
                headers: {
                    "Accept":
                        "application/json"
                },
                cf: {
                    cacheTtl: 300,
                    cacheEverything: true
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `Blogger HTTP ${response.status}`
        );
    }


    return await response.json();
}


// ============================================================
// API RESPONSE
// URL:
// /blogger-posts
//
// ALL:
// /blogger-posts?page=1
//
// LABEL:
// /blogger-posts?label=Tollywood%20Actress&page=1
// ============================================================

export async function onRequestGet({
    request
}) {

    try {

        const requestUrl =
            new URL(
                request.url
            );


        let page =
            parseInt(
                requestUrl.searchParams.get(
                    "page"
                ) || "1",
                10
            );


        if (
            !Number.isFinite(page) ||
            page < 1
        ) {
            page = 1;
        }


        const perPage = 20;


        /*
         * Read label exactly.
         *
         * URLSearchParams automatically
         * converts + to space.
         */

        const label =
            (
                requestUrl.searchParams.get(
                    "label"
                ) || ""
            ).trim();


        const startIndex =
            (
                (page - 1) *
                perPage
            ) + 1;


        const data =
            await fetchBlogger(
                startIndex,
                perPage,
                label
            );


        const entries =
            Array.isArray(
                data.feed?.entry
            )
                ? data.feed.entry
                : [];


        const posts =
            entries.map(
                createPost
            );


        const total =
            Number(
                data.feed
                    ?.openSearch$totalResults
                    ?.$t
            ) || 0;


        const totalPages =
            total > 0
                ? Math.ceil(
                    total / perPage
                )
                : (
                    posts.length === perPage
                        ? page + 1
                        : page
                );


        return new Response(

            JSON.stringify({

                success: true,

                blog:
                    "Tollywood Boost",

                source:
                    BLOG_URL,

                label:
                    label,

                page:
                    page,

                perPage:
                    perPage,

                startIndex:
                    startIndex,

                count:
                    posts.length,

                total:
                    total,

                totalPages:
                    totalPages,

                posts:
                    posts

            }),

            {

                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=UTF-8",

                    "Cache-Control":
                        "public, max-age=300, s-maxage=300",

                    "Access-Control-Allow-Origin":
                        "*"

                }

            }
        );

    } catch (error) {

        console.error(
            "Blogger Posts Error:",
            error
        );


        return new Response(

            JSON.stringify({

                success: false,

                error:
                    "Unable to load Blogger posts.",

                message:
                    error.message

            }),

            {

                status: 502,

                headers: {

                    "Content-Type":
                        "application/json; charset=UTF-8",

                    "Cache-Control":
                        "no-cache",

                    "Access-Control-Allow-Origin":
                        "*"

                }

            }
        );
    }
}
