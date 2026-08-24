// ============================================================
// functions/blogger-posts.js
// ============================================================

const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const PER_PAGE = 20;


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
            item => item.rel === "alternate"
        );

    return link
        ? link.href
        : "";
}


// ============================================================
// BLOGGER URL -> FILMSTARS URL
// ============================================================

function convertToFilmstarsUrl(bloggerUrl) {

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

    return url

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
// GET POST IMAGE
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

function createPost(entry) {

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
                "s800"
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

async function fetchBlogger(
    startIndex,
    maxResults,
    label = ""
) {

    let feedUrl;


    // --------------------------------------------------------
    // LABEL FEED
    // --------------------------------------------------------

    if (label) {

        feedUrl =
            BLOG_FEED +
            "/-/" +
            encodeURIComponent(label);

    }

    // --------------------------------------------------------
    // NORMAL FEED
    // --------------------------------------------------------

    else {

        feedUrl =
            BLOG_FEED;

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


    // Prevent Blogger cached/incorrect response
    url.searchParams.set(
        "orderby",
        "published"
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
            "Blogger HTTP " +
            response.status
        );

    }


    return await response.json();
}


// ============================================================
// GET TOTAL RESULTS
// ============================================================

function getTotalResults(data) {

    const total =
        Number(
            data.feed
                ?.openSearch$totalResults
                ?.$t
        );


    if (
        Number.isFinite(total) &&
        total >= 0
    ) {

        return total;

    }


    return 0;
}


// ============================================================
// MAIN BLOGGER POSTS HANDLER
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
        // LABEL
        // ----------------------------------------------------

        const label =
            (
                requestUrl.searchParams.get(
                    "label"
                ) || ""
            ).trim();


        // ----------------------------------------------------
        // PAGE SIZE
        // ----------------------------------------------------

        let perPage =
            parseInt(
                requestUrl.searchParams.get(
                    "max-results"
                ) ||
                String(PER_PAGE),
                10
            );


        if (
            !Number.isFinite(perPage) ||
            perPage < 1
        ) {

            perPage =
                PER_PAGE;

        }


        // Blogger supports a maximum of 150
        perPage =
            Math.min(
                perPage,
                150
            );


        // ----------------------------------------------------
        // VERY IMPORTANT
        //
        // PAGE 1 = start-index 1
        // PAGE 2 = start-index 21
        // PAGE 3 = start-index 41
        //
        // ----------------------------------------------------

        const startIndex =
            (
                (page - 1) *
                perPage
            ) + 1;


        console.log(
            "Blogger request:",
            {
                page,
                label,
                perPage,
                startIndex
            }
        );


        // ----------------------------------------------------
        // FETCH
        // ----------------------------------------------------

        const data =
            await fetchBlogger(
                startIndex,
                perPage,
                label
            );


        // ----------------------------------------------------
        // ENTRIES
        // ----------------------------------------------------

        const entries =
            Array.isArray(
                data.feed?.entry
            )
                ? data.feed.entry
                : [];


        // ----------------------------------------------------
        // POSTS
        // ----------------------------------------------------

        const posts =
            entries
                .map(createPost)
                .filter(
                    post =>
                        post.url &&
                        post.title
                );


        // ----------------------------------------------------
        // TOTAL
        // ----------------------------------------------------

        const total =
            getTotalResults(data);


        // ----------------------------------------------------
        // TOTAL PAGES
        // ----------------------------------------------------

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

                hasPreviousPage:
                    page > 1,

                hasNextPage:
                    page <
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

                success:
                    false,

                error:
                    "Unable to load Blogger posts.",

                details:
                    error &&
                    error.message
                        ? error.message
                        : String(error)

            }),

            {

                status: 500,

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
