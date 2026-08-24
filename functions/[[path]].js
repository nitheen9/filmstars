// ============================================================
// FILMSTARS - SINGLE BLOGGER POST HANDLER
// ============================================================
//
// Handles:
// /2011/03/example.html
// /2017/03/example.html
// /2026/06/example.html
//
// Includes:
// - Exact post lookup
// - Previous Post
// - Next Post
// - Previous/Next titles
// - Labels
// - 12 Related Posts
// - Related posts based on current labels
// - Duplicate first-image protection
// - High-resolution Blogger images
//
// ============================================================

const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// TEXT
// ============================================================

function getText(value) {

    if (
        value &&
        typeof value === "object" &&
        "$t" in value
    ) {

        return String(
            value.$t || ""
        );

    }

    return "";
}


// ============================================================
// BLOGGER ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (!Array.isArray(entry?.link)) {
        return "";
    }

    const link =
        entry.link.find(
            item =>
                item &&
                item.rel === "alternate" &&
                item.href
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
            new URL(
                bloggerUrl
            );

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
    size = "s1600"
) {

    if (!imageUrl) {
        return "";
    }

    let url =
        String(
            imageUrl
        );


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


    url =
        url.replace(
            /\/s\d+(?:-[a-z]+)?\//gi,
            `/${size}/`
        );


    return url;
}


// ============================================================
// IMAGE FROM POST
// ============================================================

function getPostImage(
    entry,
    content
) {

    if (
        entry?.media$thumbnail?.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            "s1600"
        );

    }


    if (!content) {
        return "";
    }


    let match =
        content.match(
            /data-original\s*=\s*["']([^"']+)["']/i
        );


    if (match) {

        return upgradeImageUrl(
            match[1],
            "s1600"
        );

    }


    match =
        content.match(
            /data-src\s*=\s*["']([^"']+)["']/i
        );


    if (match) {

        return upgradeImageUrl(
            match[1],
            "s1600"
        );

    }


    match =
        content.match(
            /<img\b[^>]*src\s*=\s*["']([^"']+)["']/i
        );


    if (match) {

        return upgradeImageUrl(
            match[1],
            "s1600"
        );

    }


    return "";
}


// ============================================================
// LABELS
// ============================================================

function getLabels(
    entry
) {

    if (
        !Array.isArray(
            entry?.category
        )
    ) {

        return [];

    }


    return entry.category

        .map(
            category =>
                String(
                    category?.term || ""
                ).trim()
        )

        .filter(
            Boolean
        );

}


// ============================================================
// CREATE POST OBJECT
// ============================================================

function createPost(
    entry
) {

    const content =
        getText(
            entry?.content
        ) ||
        getText(
            entry?.summary
        );


    const bloggerUrl =
        getAlternateUrl(
            entry
        );


    return {

        title:
            getText(
                entry?.title
            ),

        url:
            convertToFilmstarsUrl(
                bloggerUrl
            ),

        bloggerUrl:
            bloggerUrl,

        published:
            getText(
                entry?.published
            ),

        updated:
            getText(
                entry?.updated
            ),

        image:
            getPostImage(
                entry,
                content
            ),

        content:
            content,

        labels:
            getLabels(
                entry
            )

    };

}


// ============================================================
// FETCH BLOGGER JSON
// ============================================================

async function fetchFeed(
    options = {}
) {

    const {

        startIndex = null,

        maxResults = 50,

        label = "",

        publishedMin = "",

        publishedMax = "",

        query = ""

    } = options;


    let feedUrl =
        BLOG_FEED;


    // --------------------------------------------------------
    // Label feed
    // --------------------------------------------------------

    if (label) {

        feedUrl =
            BLOG_FEED +
            "/-/" +
            encodeURIComponent(
                label
            );

    }


    const url =
        new URL(
            feedUrl
        );


    url.searchParams.set(
        "alt",
        "json"
    );


    url.searchParams.set(
        "max-results",
        String(
            maxResults
        )
    );


    if (
        startIndex !== null
    ) {

        url.searchParams.set(
            "start-index",
            String(
                startIndex
            )
        );

    }


    if (publishedMin) {

        url.searchParams.set(
            "published-min",
            publishedMin
        );

    }


    if (publishedMax) {

        url.searchParams.set(
            "published-max",
            publishedMax
        );

    }


    if (query) {

        url.searchParams.set(
            "q",
            query
        );

    }


    const response =
        await fetch(
            url.toString(),
            {
                headers: {
                    "Accept":
                        "application/json"
                },
                cf: {
                    cacheTtl:
                        300,

                    cacheEverything:
                        true
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
// FIND EXACT POST
// ============================================================

async function findPost(
    year,
    month,
    slug
) {

    const targetPath =
        `/${year}/${month}/${slug}.html`;


    // ========================================================
    // METHOD 1: Search by slug
    // ========================================================

    try {

        const data =
            await fetchFeed({

                query:
                    slug,

                maxResults:
                    50

            });


        const entries =
            Array.isArray(
                data?.feed?.entry
            )
                ? data.feed.entry
                : [];


        for (
            const entry
            of entries
        ) {

            const bloggerUrl =
                getAlternateUrl(
                    entry
                );


            if (!bloggerUrl) {
                continue;
            }


            try {

                const path =
                    new URL(
                        bloggerUrl
                    ).pathname;


                if (
                    path ===
                    targetPath
                ) {

                    return createPost(
                        entry
                    );

                }

            } catch {

                // continue
            }

        }

    } catch (error) {

        console.error(
            "Slug search error:",
            error
        );

    }


    // ========================================================
    // METHOD 2: Search exact month
    // ========================================================

    try {

        const yearNumber =
            Number(
                year
            );


        const monthNumber =
            Number(
                month
            );


        const monthStart =
            new Date(
                Date.UTC(
                    yearNumber,
                    monthNumber - 1,
                    1,
                    0,
                    0,
                    0
                )
            );


        const nextMonthStart =
            new Date(
                Date.UTC(
                    yearNumber,
                    monthNumber,
                    1,
                    0,
                    0,
                    0
                )
            );


        const data =
            await fetchFeed({

                publishedMin:
                    monthStart.toISOString(),

                publishedMax:
                    nextMonthStart.toISOString(),

                maxResults:
                    150

            });


        const entries =
            Array.isArray(
                data?.feed?.entry
            )
                ? data.feed.entry
                : [];


        for (
            const entry
            of entries
        ) {

            const bloggerUrl =
                getAlternateUrl(
                    entry
                );


            if (!bloggerUrl) {
                continue;
            }


            try {

                const path =
                    new URL(
                        bloggerUrl
                    ).pathname;


                if (
                    path ===
                    targetPath
                ) {

                    return createPost(
                        entry
                    );

                }

            } catch {

                // continue
            }

        }

    } catch (error) {

        console.error(
            "Monthly post search error:",
            error
        );

    }


    return null;
}


// ============================================================
// FETCH A MONTH
// ============================================================

async function fetchMonth(
    year,
    month
) {

    const yearNumber =
        Number(
            year
        );


    const monthNumber =
        Number(
            month
        );


    if (
        !Number.isInteger(
            yearNumber
        ) ||
        !Number.isInteger(
            monthNumber
        ) ||
        monthNumber < 1 ||
        monthNumber > 12
    ) {

        return [];

    }


    const monthStart =
        new Date(
            Date.UTC(
                yearNumber,
                monthNumber - 1,
                1,
                0,
                0,
                0
            )
        );


    const nextMonthStart =
        new Date(
            Date.UTC(
                yearNumber,
                monthNumber,
                1,
                0,
                0,
                0
            )
        );


    try {

        const data =
            await fetchFeed({

                publishedMin:
                    monthStart.toISOString(),

                publishedMax:
                    nextMonthStart.toISOString(),

                maxResults:
                    150

            });


        const entries =
            Array.isArray(
                data?.feed?.entry
            )
                ? data.feed.entry
                : [];


        return entries

            .map(
                createPost
            )

            .filter(
                post =>
                    post.url
            );

    } catch (error) {

        console.error(
            "Month fetch error:",
            error
        );


        return [];

    }

}


// ============================================================
// GET PREVIOUS / NEXT
//
// We fetch current month plus adjacent months.
//
// Feed is sorted newest -> oldest.
//
// Therefore:
//
// next = newer post
// previous = older post
// ============================================================

async function getNavigation(
    currentPost,
    year,
    month
) {

    const yearNumber =
        Number(
            year
        );

    const monthNumber =
        Number(
            month
        );


    const currentMonth =
        await fetchMonth(
            yearNumber,
            monthNumber
        );


    // --------------------------------------------------------
    // Sort newest -> oldest
    // --------------------------------------------------------

    currentMonth.sort(
        (a, b) => {

            return (
                new Date(
                    b.published
                ).getTime() -
                new Date(
                    a.published
                ).getTime()
            );

        }
    );


    let index =
        currentMonth.findIndex(
            post =>
                post.url ===
                currentPost.url
        );


    // --------------------------------------------------------
    // Need older month?
    // --------------------------------------------------------

    let olderMonth =
        [];


    if (
        index ===
        currentMonth.length - 1
    ) {

        const olderDate =
            new Date(
                Date.UTC(
                    yearNumber,
                    monthNumber - 2,
                    1
                )
            );


        olderMonth =
            await fetchMonth(
                olderDate.getUTCFullYear(),
                olderDate.getUTCMonth() + 1
            );


        olderMonth.sort(
            (a, b) => {

                return (
                    new Date(
                        b.published
                    ).getTime() -
                    new Date(
                        a.published
                    ).getTime()
                );

            }
        );

    }


    // --------------------------------------------------------
    // Need newer month?
    // --------------------------------------------------------

    let newerMonth =
        [];


    if (
        index === 0
    ) {

        const newerDate =
            new Date(
                Date.UTC(
                    yearNumber,
                    monthNumber,
                    1
                )
            );


        // Don't fetch a future month.
        if (
            newerDate.getTime() <=
            Date.now()
        ) {

            newerMonth =
                await fetchMonth(
                    newerDate.getUTCFullYear(),
                    newerDate.getUTCMonth() + 1
                );


            newerMonth.sort(
                (a, b) => {

                    return (
                        new Date(
                            b.published
                        ).getTime() -
                        new Date(
                            a.published
                        ).getTime()
                    );

                }
            );

        }

    }


    // --------------------------------------------------------
    // Previous = older
    // Next = newer
    // --------------------------------------------------------

    let previous =
        null;


    let next =
        null;


    if (
        index > 0
    ) {

        next =
            currentMonth[
                index - 1
            ];

    }


    if (
        index >= 0 &&
        index < currentMonth.length - 1
    ) {

        previous =
            currentMonth[
                index + 1
            ];

    }


    // --------------------------------------------------------
    // Current post is oldest in month
    // --------------------------------------------------------

    if (
        !previous &&
        olderMonth.length > 0
    ) {

        previous =
            olderMonth[
                0
            ];

    }


    // --------------------------------------------------------
    // Current post is newest in month
    // --------------------------------------------------------

    if (
        !next &&
        newerMonth.length > 0
    ) {

        next =
            newerMonth[
                newerMonth.length - 1
            ];

    }


    return {

        previous:
            previous,

        next:
            next,

        monthPosts:
            currentMonth

    };

}


// ============================================================
// GET RELATED POSTS
//
// Uses up to 3 labels from current post.
//
// Each label feed returns up to 50 posts.
// We score posts by matching labels.
//
// Maximum 12.
// ============================================================

async function getRelatedPosts(
    currentPost
) {

    const labels =
        Array.isArray(
            currentPost.labels
        )
            ? currentPost.labels
            : [];


    if (
        labels.length === 0
    ) {

        return [];

    }


    const selectedLabels =
        labels.slice(
            0,
            3
        );


    const results =
        new Map();


    for (
        const label
        of selectedLabels
    ) {

        try {

            const data =
                await fetchFeed({

                    label:
                        label,

                    startIndex:
                        1,

                    maxResults:
                        50

                });


            const entries =
                Array.isArray(
                    data?.feed?.entry
                )
                    ? data.feed.entry
                    : [];


            const posts =
                entries
                    .map(
                        createPost
                    )
                    .filter(
                        post =>
                            post.url &&
                            post.url !==
                            currentPost.url
                    );


            for (
                const post
                of posts
            ) {

                const existing =
                    results.get(
                        post.url
                    );


                let score =
                    existing
                        ? existing.score
                        : 0;


                for (
                    const postLabel
                    of post.labels
                ) {

                    for (
                        const currentLabel
                        of selectedLabels
                    ) {

                        if (
                            postLabel
                                .toLowerCase()
                                ===
                            currentLabel
                                .toLowerCase()
                        ) {

                            score++;

                        }

                    }

                }


                results.set(
                    post.url,
                    {
                        post:
                            post,

                        score:
                            score

                    }
                );

            }

        } catch (error) {

            console.error(
                "Related label error:",
                label,
                error
            );

        }

    }


    const sorted =
        Array.from(
            results.values()
        );


    sorted.sort(
        (a, b) => {

            if (
                b.score !==
                a.score
            ) {

                return (
                    b.score -
                    a.score
                );

            }


            return (
                new Date(
                    b.post.published
                ).getTime() -
                new Date(
                    a.post.published
                ).getTime()
            );

        }
    );


    return sorted

        .slice(
            0,
            12
        )

        .map(
            item =>
                item.post
        );

}


// ============================================================
// ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value || ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// DATE
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"
        }
    );

}


// ============================================================
// NORMALIZE IMAGE URL
// ============================================================

function normalizeImageUrl(
    url
) {

    if (!url) {
        return "";
    }


    return upgradeImageUrl(
        url,
        "s1600"
    )
        .replace(
            /^https?:\/\//i,
            ""
        )
        .split("?")[0]
        .toLowerCase();

}


// ============================================================
// CLEAN POST CONTENT
// ============================================================

function cleanPostContent(
    html,
    featuredImage
) {

    if (!html) {
        return "";
    }


    let result =
        String(
            html
        );


    // --------------------------------------------------------
    // Remove scripts/styles/iframes
    // --------------------------------------------------------

    result =
        result.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );


    result =
        result.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );


    result =
        result.replace(
            /<iframe[\s\S]*?<\/iframe>/gi,
            ""
        );


    result =
        result.replace(
            /<object[\s\S]*?<\/object>/gi,
            ""
        );


    result =
        result.replace(
            /<embed[^>]*>/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove event handlers
    // --------------------------------------------------------

    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove javascript
    // --------------------------------------------------------

    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    // --------------------------------------------------------
    // Blogger image sizes
    // --------------------------------------------------------

    result =
        result.replace(
            /\/s72-c\//gi,
            "/s1600/"
        );


    result =
        result.replace(
            /\/s72\//gi,
            "/s1600/"
        );


    result =
        result.replace(
            /\/w72-h72-p-k-no-nu\//gi,
            "/s1600/"
        );


    result =
        result.replace(
            /\/w\d+-h\d+-p-k-no-nu\//gi,
            "/s1600/"
        );


    result =
        result.replace(
            /\/s\d+(?:-[a-z]+)?\//gi,
            "/s1600/"
        );


    // --------------------------------------------------------
    // Convert data-src to src
    // --------------------------------------------------------

    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            function(
                full,
                attributes
            ) {

                let attrs =
                    attributes;


                const dataSrc =
                    attrs.match(
                        /data-src\s*=\s*["']([^"']+)["']/i
                    );


                if (
                    dataSrc &&
                    !/\bsrc\s*=/i.test(
                        attrs
                    )
                ) {

                    attrs +=
                        ` src="${dataSrc[1]}"`;

                }


                attrs =
                    attrs.replace(
                        /\swidth\s*=\s*["'][^"']*["']/gi,
                        ""
                    );


                attrs =
                    attrs.replace(
                        /\sheight\s*=\s*["'][^"']*["']/gi,
                        ""
                    );


                attrs =
                    attrs.replace(
                        /\sstyle\s*=\s*["'][^"']*["']/gi,
                        ""
                    );


                return (
                    "<img" +
                    attrs +
                    ">"
                );

            }
        );


    // --------------------------------------------------------
    // Upgrade image src
    // --------------------------------------------------------

    result =
        result.replace(
            /(<img\b[^>]*?\b(?:src|data-src)\s*=\s*["'])([^"']+)(["'])/gi,
            function(
                full,
                start,
                imageUrl,
                end
            ) {

                return (
                    start +
                    upgradeImageUrl(
                        imageUrl,
                        "s1600"
                    ) +
                    end
                );

            }
        );


    // --------------------------------------------------------
    // Remove first image if same as featured image
    // --------------------------------------------------------

    if (
        featuredImage
    ) {

        const featuredNormalized =
            normalizeImageUrl(
                featuredImage
            );


        let removed =
            false;


        result =
            result.replace(
                /<img\b[^>]*>/i,
                function(
                    imageTag
                ) {

                    if (
                        removed
                    ) {

                        return imageTag;

                    }


                    const match =
                        imageTag.match(
                            /\b(?:src|data-src)\s*=\s*["']([^"']+)["']/i
                        );


                    if (!match) {

                        return imageTag;

                    }


                    const imageNormalized =
                        normalizeImageUrl(
                            match[1]
                        );


                    if (
                        imageNormalized ===
                        featuredNormalized
                    ) {

                        removed =
                            true;


                        return "";

                    }


                    return imageTag;

                }
            );

    }


    return result;

}


// ============================================================
// LABEL HTML
// ============================================================

function createLabel(
    label
) {

    return `

<a
    class="post-label"
    href="/blog?label=${encodeURIComponent(
        label
    )}"
>
${escapeHtml(label)}
</a>

`;

}


// ============================================================
// RELATED CARD
// ============================================================

function createRelatedCard(
    post
) {

    return `

<article
    class="related-card"
>

<a
    class="related-image"
    href="${escapeHtml(
        post.url
    )}"
>

${
    post.image
        ? `

<img
    src="${escapeHtml(
        post.image
    )}"
    alt="${escapeHtml(
        post.title
    )}"
    loading="lazy"
    decoding="async"
>

`
        : ""
}

</a>


<div
    class="related-info"
>

<h3>

<a
    href="${escapeHtml(
        post.url
    )}"
>
${escapeHtml(
    post.title
)}
</a>

</h3>


<div
    class="related-date"
>

${escapeHtml(
    formatDate(
        post.published
    )
)}

</div>


<a
    class="read-more"
    href="${escapeHtml(
        post.url
    )}"
>
Read More
</a>

</div>

</article>

`;

}


// ============================================================
// SINGLE PAGE
// ============================================================

function createSinglePage(
    post,
    previous,
    next,
    related
) {

    const featuredImage =
        post.image
            ? upgradeImageUrl(
                post.image,
                "s1600"
            )
            : "";


    const content =
        cleanPostContent(
            post.content,
            featuredImage
        );


    const labels =
        post.labels &&
        post.labels.length
            ? `

<div
    class="labels"
>

<strong>
Labels:
</strong>

${post.labels
    .map(
        createLabel
    )
    .join("")}

</div>

`
            : "";


    // ========================================================
    // PREVIOUS POST
    // ========================================================

    const previousHtml =
        previous
            ? `

<a
    class="post-navigation previous"
    href="${escapeHtml(
        previous.url
    )}"
>

<span>
← Previous Post
</span>

<strong>
${escapeHtml(
    previous.title
)}
</strong>

</a>

`
            : `

<div
    class="post-navigation disabled"
>

<span>
← Previous Post
</span>

<strong>
No previous post
</strong>

</div>

`;


    // ========================================================
    // NEXT POST
    // ========================================================

    const nextHtml =
        next
            ? `

<a
    class="post-navigation next"
    href="${escapeHtml(
        next.url
    )}"
>

<span>
Next Post →
</span>

<strong>
${escapeHtml(
    next.title
)}
</strong>

</a>

`
            : `

<div
    class="post-navigation disabled next"
>

<span>
Next Post →
</span>

<strong>
No next post
</strong>

</div>

`;


    // ========================================================
    // RELATED HTML
    // ========================================================

    const relatedHtml =
        related.length > 0

            ? `

<section
    class="related"
>

<h2>
Related Posts
</h2>


<div
    class="related-grid"
>

${related
    .map(
        createRelatedCard
    )
    .join("")}

</div>

</section>

`
            : `

<section
    class="related"
>

<h2>
Related Posts
</h2>

<div
    class="no-related"
>
No related posts found.
</div>

</section>

`;


    // ========================================================
    // CANONICAL
    // ========================================================

    const canonical =
        "https://filmstars.pages.dev" +
        post.url;


    return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHtml(
    post.title
)}
 | Filmstars
</title>


<meta
    name="description"
    content="${escapeHtml(
        post.title
    )}"
>


<link
    rel="canonical"
    href="${escapeHtml(
        canonical
    )}"
>


<meta
    property="og:title"
    content="${escapeHtml(
        post.title
    )}"
>


<meta
    property="og:type"
    content="article"
>


<meta
    property="og:url"
    content="${escapeHtml(
        canonical
    )}"
>


${
    featuredImage
        ? `

<meta
    property="og:image"
    content="${escapeHtml(
        featuredImage
    )}"
>

`
        : ""
}


<style>

/* ============================================================
GLOBAL
============================================================ */

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:
        #f5f6f8;

    color:
        #222;

}


/* ============================================================
HEADER
============================================================ */

.header {

    background:
        #fe5301;

    color:
        white;

}


.header-inner {

    width:
        92%;

    max-width:
        1200px;

    min-height:
        68px;

    margin:
        auto;

    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;

}


.logo {

    font-size:
        36px;

    font-weight:
        bold;

}


.logo a {

    color:
        white;

    text-decoration:
        none;

}


.nav a {

    color:
        white;

    text-decoration:
        none;

    margin-left:
        20px;

}


/* ============================================================
MAIN
============================================================ */

.main {

    width:
        92%;

    max-width:
        1050px;

    margin:
        35px auto 70px;

}


.back {

    display:
        inline-block;

    margin-bottom:
        18px;

    color:
        #47164F;

    text-decoration:
        none;

    font-weight:
        bold;

}


/* ============================================================
POST
============================================================ */

.post {

    background:
        white;

    border:
        1px solid #e5e7eb;

    border-radius:
        12px;

    padding:
        30px;

    box-shadow:
        0 4px 18px rgba(0,0,0,.06);

}


.post-title {

    font-size:
        32px;

    line-height:
        1.3;

    margin:
        0 0 12px;

}


.post-date {

    color:
        #777;

    font-size:
        14px;

    margin-bottom:
        28px;

}


/* ============================================================
FEATURED IMAGE
============================================================ */

.featured-image {

    display:
        block;

    width:
        auto;

    max-width:
        100%;

    height:
        auto;

    max-height:
        1100px;

    object-fit:
        contain;

    margin:
        0 auto 35px;

    border-radius:
        8px;

    background:
        #f2f2f2;

}


/* ============================================================
POST CONTENT
============================================================ */

.post-content {

    font-size:
        18px;

    line-height:
        1.8;

}


.post-content p {

    margin:
        0 0 22px;

}


.post-content img {

    display:
        block;

    width:
        auto;

    max-width:
        100%;

    height:
        auto;

    max-height:
        1100px;

    object-fit:
        contain;

    margin:
        30px auto;

    border-radius:
        7px;

    background:
        #f2f2f2;

}


.post-content figure {

    max-width:
        100%;

    margin:
        30px auto;

}


.post-content a {

    color:
        #2563eb;

}


/* ============================================================
LABELS
============================================================ */

.labels {

    border-top:
        1px solid #eeeeee;

    margin-top:
        30px;

    padding-top:
        20px;

    line-height:
        2.5;

}


.post-label {

    display:
        inline-block;

    margin:
        4px;

    padding:
        4px 12px;

    border-radius:
        20px;

    background:
        #47164F;

    color:
        white !important;

    text-decoration:
        none;

    font-size:
        13px;

    font-weight:
        600;

}


/* ============================================================
PREVIOUS / NEXT
============================================================ */

.post-navigation-wrapper {

    display:
        grid;

    grid-template-columns:
        1fr 1fr;

    gap:
        20px;

    margin-top:
        30px;

}


.post-navigation {

    display:
        flex;

    flex-direction:
        column;

    gap:
        8px;

    padding:
        20px;

    background:
        white;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    text-decoration:
        none;

    color:
        #222;

    transition:
        border-color .15s ease,
        box-shadow .15s ease;

}


.post-navigation:hover {

    border-color:
        #47164F;

    box-shadow:
        0 4px 14px rgba(0,0,0,.06);

}


.post-navigation span {

    color:
        #47164F;

    font-size:
        13px;

    font-weight:
        bold;

    text-transform:
        uppercase;

}


.post-navigation strong {

    font-size:
        17px;

    line-height:
        1.45;

}


.post-navigation.next {

    text-align:
        right;

}


.nav-date {

    color:
        #888;

    font-size:
        12px;

}


.post-navigation.disabled {

    opacity:
        .45;

    pointer-events:
        none;

}


/* ============================================================
RELATED POSTS
============================================================ */

.related {

    margin-top:
        55px;

}


.related h2 {

    margin:
        0 0 25px;

    font-size:
        29px;

}


.related-grid {

    display:
        grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap:
        22px;

}


.related-card {

    overflow:
        hidden;

    background:
        white;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    box-shadow:
        0 3px 12px rgba(0,0,0,.05);

    transition:
        transform .15s ease,
        box-shadow .15s ease;

}


.related-card:hover {

    transform:
        translateY(-3px);

    box-shadow:
        0 8px 20px rgba(0,0,0,.08);

}


.related-image {

    display:
        block;

    background:
        #f2f2f2;

}


.related-image img {

    display:
        block;

    width:
        100%;

    height:
        300px;

    object-fit:
        contain;

    background:
        #f2f2f2;

}


.related-info {

    padding:
        15px;

}


.related-info h3 {

    margin:
        0 0 8px;

    font-size:
        17px;

    line-height:
        1.4;

}


.related-info h3 a {

    color:
        #222;

    text-decoration:
        none;

}


.related-date {

    color:
        #777;

    font-size:
        12px;

    margin-bottom:
        12px;

}


.read-more {

    display:
        inline-block;

    padding:
        7px 11px;

    background:
        #47164F;

    color:
        white;

    border-radius:
        5px;

    text-decoration:
        none;

    font-size:
        12px;

    font-weight:
        bold;

}


.no-related {

    background:
        white;

    padding:
        25px;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    color:
        #777;

}


/* ============================================================
FOOTER
============================================================ */

.footer {

    padding:
        30px 15px;

    background:
        #111827;

    color:
        #aaa;

    text-align:
        center;

}


/* ============================================================
MOBILE
============================================================ */

@media(max-width:800px) {

    .related-grid {

        grid-template-columns:
            repeat(2, 1fr);

    }

}


@media(max-width:600px) {

    .header-inner {

        padding:
            17px 0;

    }


    .logo {

        font-size:
            28px;

    }


    .nav a {

        margin:
            0 8px;

    }


    .main {

        width:
            94%;

    }


    .post {

        padding:
            18px;

    }


    .post-title {

        font-size:
            24px;

    }


    .post-content {

        font-size:
            16px;

    }


    .featured-image {

        width:
            100%;

        max-height:
            none;

    }


    .post-content img {

        max-height:
            none;

    }


    .post-navigation-wrapper {

        grid-template-columns:
            1fr;

    }


    .post-navigation.next {

        text-align:
            left;

    }


    .related-grid {

        grid-template-columns:
            1fr;

    }


    .related-image img {

        height:
            auto;

        max-height:
            750px;

    }

}

</style>

</head>


<body>


<header class="header">

<div class="header-inner">

<div class="logo">

<a href="/">
Film Stars
</a>

</div>


<nav class="nav">

<a href="/">
Home
</a>

<a href="/blog">
Blog
</a>

</nav>

</div>

</header>


<main class="main">


<a
    class="back"
    href="/blog"
>
← Back to Blog
</a>


<article class="post">


<h1 class="post-title">

${escapeHtml(
    post.title
)}

</h1>


<div class="post-date">

Published
${escapeHtml(
    formatDate(
        post.published
    )
)}

</div>


${
    featuredImage
        ? `

<img
    class="featured-image"
    src="${escapeHtml(
        featuredImage
    )}"
    alt="${escapeHtml(
        post.title
    )}"
    decoding="async"
>

`
        : ""
}


<div class="post-content">

${content}

</div>


${labels}


</article>


<!-- ========================================================
     PREVIOUS / NEXT
     ======================================================== -->

<div
    class="post-navigation-wrapper"
>

${previousHtml}

${nextHtml}

</div>


<!-- ========================================================
     RELATED POSTS
     ======================================================== -->

${relatedHtml}


</main>


<footer class="footer">

© ${new Date().getFullYear()}
Filmstars

</footer>


</body>

</html>`;

}


// ============================================================
// NOT FOUND
// ============================================================

function notFoundResponse(
    pathname
) {

    return new Response(

`<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
Post Not Found | Filmstars
</title>

<style>

body {

    margin:
        0;

    font-family:
        Arial,
        sans-serif;

    background:
        #f5f6f8;

    text-align:
        center;

    padding:
        60px 20px;

}

.box {

    max-width:
        700px;

    margin:
        auto;

    background:
        white;

    padding:
        40px;

    border-radius:
        12px;

}

a {

    color:
        #47164F;

    text-decoration:
        none;

    font-weight:
        bold;

}

.path {

    color:
        #777;

    word-break:
        break-all;

}

</style>

</head>

<body>

<div class="box">

<h1>
Post Not Found
</h1>

<p>
The requested Blogger post could not be found.
</p>

<p class="path">
${escapeHtml(
    pathname
)}
</p>

<p>

<a href="/blog">
← Back to Blog
</a>

</p>

</div>

</body>

</html>`,

        {

            status:
                404,

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8",

                "Cache-Control":
                    "no-cache"

            }

        }

    );

}


// ============================================================
// MAIN ROUTER
// ============================================================

export async function onRequest(
    context
) {

    const requestUrl =
        new URL(
            context.request.url
        );


    const pathname =
        requestUrl.pathname;


    // ========================================================
    // STATIC PAGES
    //
    // [[path]].js is a multipath route, so explicitly pass
    // normal pages through to the static asset server.
    // ========================================================

    const staticPages = [

        "/",

        "/index.html",

        "/blog",

        "/blog/",

        "/blog.html",

        "/about",

        "/about/",

        "/about.html",

        "/contact",

        "/contact/",

        "/contact.html",

        "/privacy-policy",

        "/privacy-policy/",

        "/privacy-policy.html",

        "/disclaimer",

        "/disclaimer/",

        "/disclaimer.html"

    ];


    if (
        staticPages.includes(
            pathname
        )
    ) {

        return context.next();

    }


    // ========================================================
    // ONLY HANDLE:
    //
    // /YYYY/MM/slug.html
    // ========================================================

    const match =
        pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );


    if (!match) {

        return context.next();

    }


    const year =
        match[1];


    const month =
        match[2];


    const slug =
        match[3];


    const monthNumber =
        Number(
            month
        );


    if (
        !Number.isInteger(
            monthNumber
        ) ||
        monthNumber < 1 ||
        monthNumber > 12
    ) {

        return context.next();

    }


    try {

        // ----------------------------------------------------
        // FIND CURRENT POST
        // ----------------------------------------------------

        const currentPost =
            await findPost(
                year,
                month,
                slug
            );


        if (!currentPost) {

            return notFoundResponse(
                pathname
            );

        }


        // ----------------------------------------------------
        // PREVIOUS / NEXT
        // ----------------------------------------------------

        const navigation =
            await getNavigation(
                currentPost,
                year,
                month
            );


        // ----------------------------------------------------
        // RELATED
        // ----------------------------------------------------

        const related =
            await getRelatedPosts(
                currentPost
            );


        console.log(
            "Single post:",
            currentPost.title
        );


        console.log(
            "Previous:",
            navigation.previous
                ? navigation.previous.title
                : "none"
        );


        console.log(
            "Next:",
            navigation.next
                ? navigation.next.title
                : "none"
        );


        console.log(
            "Related:",
            related.length
        );


        // ----------------------------------------------------
        // CREATE PAGE
        // ----------------------------------------------------

        const html =
            createSinglePage(
                currentPost,
                navigation.previous,
                navigation.next,
                related
            );


        return new Response(

            html,

            {

                status:
                    200,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8",

                    "Cache-Control":
                        "public, max-age=60, s-maxage=60"

                }

            }

        );

    } catch (error) {

        console.error(
            "Filmstars single post error:",
            error
        );


        return new Response(

`<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<title>
Unable to Load Post | Filmstars
</title>

</head>

<body>

<div
    style="
        max-width:700px;
        margin:60px auto;
        padding:40px;
        text-align:center;
        font-family:Arial;
    "
>

<h1>
Unable to load post
</h1>

<p>
${escapeHtml(
    error?.message ||
    "Please try again later."
)}
</p>

<p>

<a href="/blog">
← Back to Blog
</a>

</p>

</div>

</body>

</html>`,

            {

                status:
                    502,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8",

                    "Cache-Control":
                        "no-cache"

                }

            }

        );

    }

}
