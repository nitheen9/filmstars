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
// Blogger source:
// https://tollywoodboost.blogspot.com/
//
// Supports old posts from 2011 through current posts.
// ============================================================


const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const PER_PAGE_DEFAULT = 20;

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
        return value.$t || "";
    }

    return "";
}


// ============================================================
// ALTERNATE BLOGGER URL
// ============================================================

function getAlternateUrl(entry) {

    if (
        !Array.isArray(entry.link)
    ) {
        return "";
    }

    const link =
        entry.link.find(
            item =>
                item.rel === "alternate"
        );

    return link
        ? link.href
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
    url,
    size = "s800"
) {

    if (!url) {
        return "";
    }

    return String(url)

        .replace(
            /\/s72-c\//g,
            `/${size}/`
        )

        .replace(
            /\/s72\//g,
            `/${size}/`
        )

        .replace(
            /\/w72-h72-p-k-no-nu\//g,
            `/${size}/`
        )

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

function getPostImage(
    entry,
    content,
    size = "s800"
) {

    if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            size
        );
    }


    if (content) {

        let match =
            content.match(
                /data-src=["']([^"']+)["']/i
            );

        if (match) {

            return upgradeImageUrl(
                match[1],
                size
            );
        }


        match =
            content.match(
                /<img[^>]+src=["']([^"']+)["']/i
            );

        if (match) {

            return upgradeImageUrl(
                match[1],
                size
            );
        }
    }


    return "";
}


// ============================================================
// LABELS
// ============================================================

function getLabels(entry) {

    if (
        !Array.isArray(entry.category)
    ) {
        return [];
    }

    return entry.category

        .map(
            category =>
                category.term || ""
        )

        .filter(Boolean);
}


// ============================================================
// CREATE POST OBJECT
// ============================================================

function createPost(
    entry,
    imageSize = "s800"
) {

    const content =
        getText(entry.content) ||
        getText(entry.summary);


    const bloggerUrl =
        getAlternateUrl(entry);


    const filmstarsUrl =
        convertToFilmstarsUrl(
            bloggerUrl
        );


    return {

        title:
            getText(entry.title),

        url:
            filmstarsUrl,

        bloggerUrl:
            bloggerUrl,

        published:
            getText(entry.published),

        updated:
            getText(entry.updated),

        image:
            getPostImage(
                entry,
                content,
                imageSize
            ),

        content:
            content,

        labels:
            getLabels(entry)
    };
}


// ============================================================
// FETCH BLOGGER FEED
// ============================================================
//
// IMPORTANT:
// Blogger feed supports start-index and max-results.
// We use the feed total to calculate pagination.
//
// Label feeds use:
// /feeds/posts/default/-/LABEL
// ============================================================

async function fetchBloggerFeed(
    startIndex,
    maxResults,
    label = ""
) {

    let feedUrl =
        BLOG_FEED;


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
// NUMBER HELPER
// ============================================================

function getTotal(
    feed
) {

    return (
        Number(
            feed
                ?.openSearch$totalResults
                ?.$t
        ) || 0
    );
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


        let perPage =
            parseInt(
                requestUrl.searchParams.get(
                    "max-results"
                ) ||
                String(PER_PAGE_DEFAULT),
                10
            );


        if (
            !Number.isFinite(perPage) ||
            perPage < 1
        ) {

            perPage =
                PER_PAGE_DEFAULT;
        }


        perPage =
            Math.min(
                perPage,
                MAX_PER_PAGE
            );


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
            await fetchBloggerFeed(
                startIndex,
                perPage,
                label
            );


        const feed =
            data.feed || {};


        const entries =
            Array.isArray(
                feed.entry
            )
                ? feed.entry
                : [];


        const posts =
            entries

                .map(
                    entry =>
                        createPost(
                            entry,
                            "s800"
                        )
                )

                .filter(
                    post =>
                        post.url
                );


        const total =
            getTotal(feed);


        const totalPages =
            total > 0
                ? Math.ceil(
                    total / perPage
                )
                : 0;


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

                hasPrevious:
                    page > 1,

                hasNext:
                    page < totalPages,

                posts:
                    posts

            }),

            {

                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=UTF-8",

                    "Cache-Control":
                        "public, max-age=300, s-maxage=300"

                }

            }
        );

    } catch (error) {

        console.error(
            "Blogger posts error:",
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
                        "no-cache"

                }

            }
        );
    }
}
