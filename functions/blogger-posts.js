const BLOG_URL =
    "https://tollywoodboost.blogspot.com/";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// TEXT
// ============================================================

function getText(value) {

    return value && value.$t
        ? value.$t
        : "";

}


// ============================================================
// BLOGGER ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (!Array.isArray(entry.link)) {
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
// FILMSTARS URL
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

    }
    catch {

        return "";

    }

}


// ============================================================
// SLUG
// ============================================================

function getSlug(url) {

    if (!url) {
        return "";
    }

    try {

        const pathname =
            url.startsWith("http")
                ? new URL(url).pathname
                : url;

        const match =
            pathname.match(
                /^\/\d{4}\/\d{2}\/([^/]+)\.html$/
            );

        return match
            ? match[1]
            : "";

    }
    catch {

        return "";

    }

}


// ============================================================
// HIGH QUALITY BLOGGER IMAGE
// ============================================================

function upgradeImageUrl(
    url,
    size = "s1600"
) {

    if (!url) {
        return "";
    }

    return url

        .replace(
            /\/s72-c\//g,
            "/" + size + "/"
        )

        .replace(
            /\/s72\//g,
            "/" + size + "/"
        )

        .replace(
            /\/w72-h72-p-k-no-nu\//g,
            "/" + size + "/"
        )

        .replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/" + size + "/"
        )

        .replace(
            /\/s\d+\//g,
            "/" + size + "/"
        );

}


// ============================================================
// GET IMAGE
// ============================================================

function getPostImage(
    entry,
    content,
    size = "s1600"
) {

    // Blogger thumbnail

    if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            size
        );

    }


    if (!content) {
        return "";
    }


    let match =
        content.match(
            /data-original=["']([^"']+)["']/i
        );

    if (match) {

        return upgradeImageUrl(
            match[1],
            size
        );

    }


    match =
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

        .map(
            category =>
                category.term || ""
        )

        .filter(Boolean);

}


// ============================================================
// CREATE POST
// ============================================================

function createPost(
    entry,
    imageSize = "s1600"
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
// FETCH BLOGGER
// IMPORTANT:
// label is sent to Blogger itself.
// ============================================================

async function fetchBlogger(
    startIndex = 1,
    maxResults = 20,
    label = ""
) {

    const params =
        new URLSearchParams();

    params.set(
        "alt",
        "json"
    );

    params.set(
        "start-index",
        String(startIndex)
    );

    params.set(
        "max-results",
        String(maxResults)
    );


    /*
       IMPORTANT

       Blogger supports:

       /feeds/posts/default/-/Label

       This gives the actual label feed.

       Do NOT fetch all posts and filter only
       the current 20 posts in JavaScript.
    */

    let feedUrl;


    if (label) {

        feedUrl =
            BLOG_FEED +
            "/-/" +
            encodeURIComponent(label) +
            "?" +
            params.toString();

    }
    else {

        feedUrl =
            BLOG_FEED +
            "?" +
            params.toString();

    }


    const response =
        await fetch(
            feedUrl,
            {
                headers: {
                    "User-Agent":
                        "Filmstars Pages Blogger Reader",
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
            "Blogger HTTP " +
            response.status
        );

    }


    return await response.json();

}


// ============================================================
// API
// ============================================================

async function bloggerApi(
    requestUrl
) {

    let startIndex =
        parseInt(
            requestUrl.searchParams.get(
                "start-index"
            ) || "1",
            10
        );


    let maxResults =
        parseInt(
            requestUrl.searchParams.get(
                "max-results"
            ) || "20",
            10
        );


    let label =
        requestUrl.searchParams.get(
            "label"
        ) || "";


    label =
        label.trim();


    if (
        !Number.isFinite(
            startIndex
        ) ||
        startIndex < 1
    ) {

        startIndex = 1;

    }


    if (
        !Number.isFinite(
            maxResults
        ) ||
        maxResults < 1
    ) {

        maxResults = 20;

    }


    maxResults =
        Math.min(
            maxResults,
            50
        );


    const data =
        await fetchBlogger(
            startIndex,
            maxResults,
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
            entry =>
                createPost(
                    entry,
                    "s1600"
                )
        );


    const total =
        Number(
            data.feed
                ?.openSearch$totalResults
                ?.$t
        ) || 0;


    return new Response(

        JSON.stringify({

            success:
                true,

            blog:
                "Tollywood Boost",

            source:
                BLOG_URL,

            label:
                label,

            count:
                posts.length,

            total:
                total,

            startIndex:
                startIndex,

            maxResults:
                maxResults,

            posts:
                posts

        }),

        {

            status:
                200,

            headers: {

                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "public, max-age=300, s-maxage=300"

            }

        }

    );

}


// ============================================================
// CLOUDFLARE PAGES FUNCTION
// ============================================================

export async function onRequest(
    context
) {

    const url =
        new URL(
            context.request.url
        );


    try {

        return await bloggerApi(
            url
        );

    }
    catch (error) {

        console.error(
            "Blogger API error:",
            error
        );


        return new Response(

            JSON.stringify({

                success:
                    false,

                error:
                    error.message ||
                    "Unable to load Blogger posts."

            }),

            {

                status:
                    502,

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
