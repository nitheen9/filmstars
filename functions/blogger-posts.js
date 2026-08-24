// ============================================================
// FILMSTARS - BLOGGER POSTS API
// ============================================================
//
// Route:
// /blogger-posts
//
// Examples:
//
// /blogger-posts
// /blogger-posts?page=2
// /blogger-posts?label=Hollywood%20Actress
// /blogger-posts?label=Hollywood%20Actress&page=2
//
// Source:
// https://tollywoodboost.blogspot.com
//
// IMPORTANT:
// - Supports Blogger posts from old and new years.
// - Uses Blogger start-index pagination.
// - Preserves label filtering.
// - Returns real Blogger total count.
// ============================================================


const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const DEFAULT_PER_PAGE = 20;

const MAX_PER_PAGE = 50;


// ============================================================
// TEXT
// ============================================================

function getText(value) {

    if (
        value &&
        typeof value === "object" &&
        "$t" in value
    ) {
        return String(value.$t || "");
    }

    return "";
}


// ============================================================
// ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (!Array.isArray(entry?.link)) {
        return "";
    }

    const item =
        entry.link.find(
            link =>
                link &&
                link.rel === "alternate" &&
                link.href
        );

    return item
        ? item.href
        : "";
}


// ============================================================
// BLOGGER URL -> FILMSTARS URL
// ============================================================

function convertToFilmstarsUrl(
    bloggerUrl
) {

    if (!bloggerUrl) {
        return "";
    }

    try {

        const url =
            new URL(bloggerUrl);

        const match =
            url.pathname.match(
                /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
            );

        if (!match) {
            return "";
        }

        return (
            "/" +
            match[1] +
            "/" +
            match[2] +
            "/" +
            match[3] +
            ".html"
        );

    } catch {

        return "";
    }
}


// ============================================================
// IMAGE URL
// ============================================================

function upgradeImageUrl(
    imageUrl,
    size = "s800"
) {

    if (!imageUrl) {
        return "";
    }

    let url =
        String(imageUrl);

    // Blogger thumbnail formats
    url =
        url.replace(
            /\/s72-c\//gi,
            `/${size}/`
        );

    url =
        url.replace(
            /\/s72\//gi,
            `/${size}/`
        );

    url =
        url.replace(
            /\/w72-h72-p-k-no-nu\//gi,
            `/${size}/`
        );

    url =
        url.replace(
            /\/w\d+-h\d+-p-k-no-nu\//gi,
            `/${size}/`
        );

    // Blogger /sXXX/ format
    url =
        url.replace(
            /\/s\d+(?:-[a-z]+)?\//gi,
            `/${size}/`
        );

    return url;
}


// ============================================================
// GET FIRST IMAGE
// ============================================================

function getPostImage(
    entry,
    content,
    size = "s800"
) {

    // Blogger thumbnail
    if (
        entry?.media$thumbnail?.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            size
        );
    }


    if (!content) {
        return "";
    }


    // data-src
    let match =
        content.match(
            /data-src\s*=\s*["']([^"']+)["']/i
        );

    if (match) {

        return upgradeImageUrl(
            match[1],
            size
        );
    }


    // src
    match =
        content.match(
            /<img\b[^>]*src\s*=\s*["']([^"']+)["']/i
        );

    if (match) {

        return upgradeImageUrl(
            match[1],
            size
        );
    }


    return "";
}


// ============================================================
// LABELS
// ============================================================

function getLabels(entry) {

    if (!Array.isArray(entry?.category)) {
        return [];
    }

    return entry.category
        .map(
            category =>
                String(
                    category?.term || ""
                ).trim()
        )
        .filter(Boolean);
}


// ============================================================
// CREATE POST
// ============================================================

function createPost(
    entry
) {

    const content =
        getText(entry?.content) ||
        getText(entry?.summary);


    const bloggerUrl =
        getAlternateUrl(entry);


    return {

        title:
            getText(entry?.title),

        url:
            convertToFilmstarsUrl(
                bloggerUrl
            ),

        bloggerUrl:
            bloggerUrl,

        published:
            getText(entry?.published),

        updated:
            getText(entry?.updated),

        image:
            getPostImage(
                entry,
                content,
                "s800"
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
    page,
    perPage,
    label
) {

    const startIndex =
        (
            (page - 1) *
            perPage
        ) + 1;


    let feedUrl =
        BLOG_FEED;


    // --------------------------------------------------------
    // Label feed
    // --------------------------------------------------------

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
        String(perPage)
    );


    const response =
        await fetch(
            url.toString(),
            {
                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `Blogger returned HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    return {
        data,
        startIndex
    };
}


// ============================================================
// TOTAL
// ============================================================

function getTotal(
    feed
) {

    const value =
        feed
            ?.openSearch$totalResults
            ?.$t;


    const total =
        Number(value);


    return Number.isFinite(total)
        ? total
        : 0;
}


// ============================================================
// API
// ============================================================

export async function onRequest(
    context
) {

    try {

        const requestUrl =
            new URL(
                context.request.url
            );


        // ----------------------------------------------------
        // PAGE
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // PER PAGE
        // ----------------------------------------------------

        let perPage =
            parseInt(
                requestUrl.searchParams.get(
                    "max-results"
                ) ||
                String(DEFAULT_PER_PAGE),
                10
            );


        if (
            !Number.isFinite(perPage) ||
            perPage < 1
        ) {

            perPage =
                DEFAULT_PER_PAGE;
        }


        perPage =
            Math.min(
                perPage,
                MAX_PER_PAGE
            );


        // ----------------------------------------------------
        // LABEL
        // ----------------------------------------------------

        const label =
            (
                requestUrl.searchParams.get(
                    "label"
                ) || ""
            ).trim();


        // ----------------------------------------------------
        // FETCH
        // ----------------------------------------------------

        const {
            data,
            startIndex
        } =
            await fetchBlogger(
                page,
                perPage,
                label
            );


        const feed =
            data?.feed || {};


        const entries =
            Array.isArray(
                feed.entry
            )
                ? feed.entry
                : [];


        // ----------------------------------------------------
        // POSTS
        // ----------------------------------------------------

        const posts =
            entries
                .map(
                    createPost
                )
                .filter(
                    post =>
                        post.url &&
                        post.title
                );


        // ----------------------------------------------------
        // TOTAL
        // ----------------------------------------------------

        const total =
            getTotal(feed);


        const totalPages =
            total > 0
                ? Math.ceil(
                    total /
                    perPage
                )
                : 0;


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        const result = {

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

            hasPrevious:
                page > 1,

            hasNext:
                totalPages > 0 &&
                page < totalPages,

            posts:
                posts

        };


        return new Response(
            JSON.stringify(result),
            {
                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=UTF-8",

                    "Cache-Control":
                        "public, max-age=60, s-maxage=60",

                    "Access-Control-Allow-Origin":
                        "*"

                }
            }
        );


    } catch (error) {

        console.error(
            "Filmstars Blogger API error:",
            error
        );


        return new Response(

            JSON.stringify({

                success: false,

                error:
                    "Unable to load Blogger posts.",

                details:
                    String(
                        error?.message ||
                        error
                    )

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
