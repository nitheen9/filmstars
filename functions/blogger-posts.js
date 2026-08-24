const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// HELPERS
// ============================================================

function getText(value) {
    return value && value.$t ? value.$t : "";
}


// ============================================================
// BLOGGER ALTERNATE URL
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
// BLOGGER URL -> FILMSTARS URL
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
// SLUG
// ============================================================

function getSlug(url) {

    if (!url) {
        return "";
    }

    try {

        const pathname =
            url.startsWith("http://") ||
            url.startsWith("https://")
                ? new URL(url).pathname
                : url;

        const match = pathname.match(
            /^\/\d{4}\/\d{2}\/([^/]+)\.html$/
        );

        return match
            ? match[1]
            : "";

    } catch {

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

    let result = url;

    result = result.replace(
        /\/s72-c\//g,
        "/" + size + "/"
    );

    result = result.replace(
        /\/s72\//g,
        "/" + size + "/"
    );

    result = result.replace(
        /\/s\d+(-c)?\//g,
        "/" + size + "/"
    );

    result = result.replace(
        /\/w\d+-h\d+(-p-k-no-nu)?\//g,
        "/" + size + "/"
    );

    result = result.replace(
        /\/w\d+-h\d+-p-k-no-nu\//g,
        "/" + size + "/"
    );

    return result;
}


// ============================================================
// FIND FIRST IMAGE
// ============================================================

function getPostImage(
    entry,
    content,
    size = "s1600"
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

    if (!content) {
        return "";
    }


    let match = content.match(
        /data-src=["']([^"']+)["']/i
    );

    if (match) {

        return upgradeImageUrl(
            match[1],
            size
        );

    }


    match = content.match(
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
        .map(category => category.term || "")
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
// FETCH BLOGGER FEED
// ============================================================

async function fetchFeed(
    options = {}
) {

    const {

        startIndex = 1,

        maxResults = 20,

        label = "",

        query = ""

    } = options;


    let feedUrl;


    /*
     * LABEL FEED
     *
     * Example:
     *
     * /feeds/posts/default/-/Tollywood%20Actress
     *
     */

    if (label) {

        feedUrl =
            BLOG_FEED +
            "/-/" +
            encodeURIComponent(label);

    } else {

        feedUrl =
            BLOG_FEED;

    }


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
     * Blogger search query.
     *
     * Used for finding an individual post.
     */

    if (query) {

        params.set(
            "q",
            query
        );

    }


    const url =
        feedUrl +
        "?" +
        params.toString();


    const response =
        await fetch(
            url,
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
            "Blogger HTTP " +
            response.status
        );

    }


    return await response.json();
}


// ============================================================
// GET TOTAL
// ============================================================

function getTotal(feed) {

    return Number(
        feed
            ?.openSearch$totalResults
            ?.$t
    ) || 0;
}


// ============================================================
// GET ENTRIES
// ============================================================

function getEntries(data) {

    return Array.isArray(
        data?.feed?.entry
    )
        ? data.feed.entry
        : [];
}


// ============================================================
// BLOG LIST API
//
// /blogger-posts
//
// /blogger-posts?page=2
//
// /blogger-posts?label=Tollywood%20Actress
//
// /blogger-posts?label=Tollywood%20Actress&page=2
//
// ============================================================

async function listPosts(
    requestUrl
) {

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


    const startIndex =
        (
            (page - 1) *
            perPage
        ) + 1;


    const label =
        (
            requestUrl.searchParams.get(
                "label"
            ) || ""
        ).trim();


    const data =
        await fetchFeed({

            startIndex:

                startIndex,

            maxResults:

                perPage,

            label:

                label

        });


    const entries =
        getEntries(
            data.feed
        );


    const posts =
        entries.map(
            entry =>
                createPost(
                    entry,
                    "s1600"
                )
        );


    const total =
        getTotal(
            data.feed
        );


    return new Response(

        JSON.stringify({

            success: true,

            blog:
                "Tollywood Boost",

            source:
                BLOG_URL,

            page:
                page,

            perPage:
                perPage,

            startIndex:
                startIndex,

            total:
                total,

            totalPages:
                Math.ceil(
                    total /
                    perPage
                ),

            label:
                label,

            count:
                posts.length,

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
}


// ============================================================
// FIND SINGLE POST
//
// We first use Blogger's q parameter with the slug.
// Then verify the exact URL.
//
// ============================================================

async function findSinglePost(
    slug
) {

    /*
     * Search Blogger using slug.
     */

    const searchData =
        await fetchFeed({

            startIndex:
                1,

            maxResults:
                20,

            query:
                slug

        });


    const searchEntries =
        getEntries(
            searchData.feed
        );


    let posts =
        searchEntries.map(
            entry =>
                createPost(
                    entry,
                    "s1600"
                )
        );


    /*
     * Exact slug match.
     */

    let post =
        posts.find(
            item =>
                getSlug(
                    item.url
                ) === slug
        );


    if (post) {
        return post;
    }


    /*
     * Search by Blogger URL if needed.
     */

    post =
        posts.find(
            item => {

                return (
                    getSlug(
                        item.bloggerUrl
                    ) === slug
                );

            }
        );


    if (post) {
        return post;
    }


    /*
     * Last fallback:
     *
     * Search recent pages in batches.
     *
     * This is only used when q=slug does not
     * return the post.
     */

    for (
        let start = 1;
        start <= 1000;
        start += 150
    ) {

        const data =
            await fetchFeed({

                startIndex:
                    start,

                maxResults:
                    150

            });


        const entries =
            getEntries(
                data.feed
            );


        if (
            entries.length === 0
        ) {

            break;

        }


        posts =
            entries.map(
                entry =>
                    createPost(
                        entry,
                        "s1600"
                    )
            );


        post =
            posts.find(
                item =>
                    getSlug(
                        item.url
                    ) === slug
            );


        if (post) {
            return post;
        }


        if (
            entries.length < 150
        ) {

            break;

        }

    }


    return null;
}


// ============================================================
// FIND PREVIOUS / NEXT
//
// For navigation we fetch a reasonable recent collection.
//
// ============================================================

async function getNavigationPosts(
    currentPost
) {

    const posts = [];

    const seen =
        new Set();


    /*
     * Search by the current post's labels first.
     *
     * This gives better navigation for labelled blogs.
     */

    const labels =
        Array.isArray(
            currentPost.labels
        )
            ? currentPost.labels
            : [];


    if (labels.length > 0) {

        const label =
            labels[0];


        for (
            let start = 1;
            start <= 1000;
            start += 150
        ) {

            const data =
                await fetchFeed({

                    startIndex:
                        start,

                    maxResults:
                        150,

                    label:
                        label

                });


            const entries =
                getEntries(
                    data.feed
                );


            if (
                entries.length === 0
            ) {

                break;

            }


            for (
                const entry of entries
            ) {

                const post =
                    createPost(
                        entry,
                        "s800"
                    );


                if (
                    post.url &&
                    !seen.has(
                        post.url
                    )
                ) {

                    seen.add(
                        post.url
                    );

                    posts.push(
                        post
                    );

                }

            }


            if (
                entries.length < 150
            ) {

                break;

            }

        }

    }


    /*
     * If not enough posts, get general feed.
     */

    if (
        posts.length < 20
    ) {

        const data =
            await fetchFeed({

                startIndex:
                    1,

                maxResults:
                    150

            });


        const entries =
            getEntries(
                data.feed
            );


        for (
            const entry of entries
        ) {

            const post =
                createPost(
                    entry,
                    "s800"
                );


            if (
                post.url &&
                !seen.has(
                    post.url
                )
            ) {

                seen.add(
                    post.url
                );

                posts.push(
                    post
                );

            }

        }

    }


    /*
     * Find current post.
     */

    const index =
        posts.findIndex(
            post =>
                post.url ===
                currentPost.url
        );


    if (index === -1) {

        return {

            previous:
                null,

            next:
                null,

            posts:
                posts

        };

    }


    /*
     * Feed is newest -> oldest.
     *
     * Previous = older
     * Next = newer
     */

    return {

        previous:
            index <
            posts.length - 1
                ? posts[index + 1]
                : null,

        next:
            index > 0
                ? posts[index - 1]
                : null,

        posts:
            posts

    };
}


// ============================================================
// API HANDLER
// ============================================================

export async function onRequest(
    context
) {

    const requestUrl =
        new URL(
            context.request.url
        );


    try {

        /*
         * Single-post API
         *
         * /blogger-posts?slug=xxxxx
         */

        const slug =
            requestUrl.searchParams.get(
                "slug"
            );


        if (slug) {

            const post =
                await findSinglePost(
                    slug
                );


            if (!post) {

                return new Response(

                    JSON.stringify({

                        success:
                            false,

                        error:
                            "Post not found"

                    }),

                    {

                        status:
                            404,

                        headers: {

                            "Content-Type":
                                "application/json; charset=UTF-8",

                            "Cache-Control":
                                "no-cache"

                        }

                    }

                );

            }


            const navigation =
                await getNavigationPosts(
                    post
                );


            return new Response(

                JSON.stringify({

                    success:
                        true,

                    post:
                        post,

                    previous:
                        navigation.previous,

                    next:
                        navigation.next,

                    navigationPosts:
                        navigation.posts

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


        /*
         * Normal blog listing.
         */

        return await listPosts(
            requestUrl
        );


    } catch (error) {

        console.error(
            "Blogger API error:",
            error
        );


        return new Response(

            JSON.stringify({

                success:
                    false,

                error:
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
