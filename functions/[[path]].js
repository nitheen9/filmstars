// ============================================================
// FILMSTARS - SINGLE BLOGGER POST HANDLER
// ============================================================
//
// Handles:
//
// /2011/03/example.html
// /2017/03/example.html
// /2026/06/example.html
//
// Features:
//
// - Exact old/new Blogger post lookup
// - High quality images
// - Removes duplicate first image
// - Displays labels
// - Displays 12 related posts
// - Related posts are selected from the CURRENT POST LABELS
// - Related links stay on filmstars.pages.dev
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
// GET POST IMAGE
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
// CREATE POST
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
// FIND SINGLE POST
// ============================================================

async function findPost(
    year,
    month,
    slug
) {

    const targetPath =
        `/${year}/${month}/${slug}.html`;


    // ========================================================
    // METHOD 1: Blogger q search
    // ========================================================

    try {

        const url =
            new URL(
                BLOG_FEED
            );


        url.searchParams.set(
            "alt",
            "json"
        );


        url.searchParams.set(
            "q",
            slug
        );


        url.searchParams.set(
            "max-results",
            "50"
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


        if (
            response.ok
        ) {

            const data =
                await response.json();


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

                    const bloggerPath =
                        new URL(
                            bloggerUrl
                        ).pathname;


                    if (
                        bloggerPath ===
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

        }

    } catch (error) {

        console.error(
            "Slug search error:",
            error
        );

    }


    // ========================================================
    // METHOD 2: Exact month
    // ========================================================

    try {

        const startDate =
            `${year}-${month}-01T00:00:00Z`;


        const monthNumber =
            Number(month);


        const yearNumber =
            Number(year);


        const nextMonth =
            new Date(
                Date.UTC(
                    yearNumber,
                    monthNumber,
                    1
                )
            );


        const endDate =
            nextMonth.toISOString();


        const url =
            new URL(
                BLOG_FEED
            );


        url.searchParams.set(
            "alt",
            "json"
        );


        url.searchParams.set(
            "published-min",
            startDate
        );


        url.searchParams.set(
            "published-max",
            endDate
        );


        url.searchParams.set(
            "max-results",
            "150"
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


        if (
            response.ok
        ) {

            const data =
                await response.json();


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

                    const bloggerPath =
                        new URL(
                            bloggerUrl
                        ).pathname;


                    if (
                        bloggerPath ===
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

        }

    } catch (error) {

        console.error(
            "Monthly search error:",
            error
        );

    }


    return null;
}


// ============================================================
// FETCH BLOGGER LABEL
// ============================================================
//
// Example:
//
// /feeds/posts/default/-/Hollywood%20Actress
//
// We request 50 posts for each label.
//
// ============================================================

async function fetchLabelPosts(
    label
) {

    if (!label) {
        return [];
    }


    try {

        const url =
            new URL(
                BLOG_FEED +
                "/-/" +
                encodeURIComponent(
                    label
                )
            );


        url.searchParams.set(
            "alt",
            "json"
        );


        url.searchParams.set(
            "start-index",
            "1"
        );


        url.searchParams.set(
            "max-results",
            "50"
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


        if (
            !response.ok
        ) {

            console.error(
                "Label feed HTTP:",
                response.status,
                label
            );

            return [];

        }


        const data =
            await response.json();


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
                    post.url &&
                    post.title
            );


    } catch (error) {

        console.error(
            "Label feed error:",
            error
        );


        return [];

    }
}


// ============================================================
// GET RELATED POSTS
// ============================================================
//
// Related posts are based on matching labels.
//
// We use up to 3 labels from the current post.
//
// Then we score matching labels.
//
// Maximum 12 related posts.
//
// ============================================================

async function getRelatedPosts(
    currentPost
) {

    if (
        !currentPost ||
        !Array.isArray(
            currentPost.labels
        ) ||
        currentPost.labels.length === 0
    ) {

        return [];

    }


    const labels =
        currentPost.labels
            .slice(
                0,
                3
            );


    const results = [];


    const seen =
        new Set();


    for (
        const label
        of labels
    ) {

        const posts =
            await fetchLabelPosts(
                label
            );


        for (
            const post
            of posts
        ) {

            if (
                !post.url ||
                post.url ===
                    currentPost.url
            ) {

                continue;

            }


            if (
                seen.has(
                    post.url
                )
            ) {

                continue;

            }


            seen.add(
                post.url
            );


            let score =
                0;


            for (
                const postLabel
                of (
                    post.labels || []
                )
            ) {

                for (
                    const currentLabel
                    of labels
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


            results.push({

                post:
                    post,

                score:
                    score

            });

        }

    }


    // ========================================================
    // Sort:
    // 1. Most matching labels
    // 2. Newest posts
    // ========================================================

    results.sort(
        (
            a,
            b
        ) => {

            if (
                b.score !==
                a.score
            ) {

                return (
                    b.score -
                    a.score
                );

            }


            const dateA =
                new Date(
                    a.post.published
                ).getTime();


            const dateB =
                new Date(
                    b.post.published
                ).getTime();


            return (
                dateB -
                dateA
            );

        }
    );


    return results

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
// ESCAPE HTML
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
// IMAGE NORMALIZATION
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
        .toLowerCase()
        .split("?")[0];

}


// ============================================================
// CLEAN CONTENT
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


    // Remove scripts
    result =
        result.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );


    // Remove styles
    result =
        result.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );


    // Remove iframes
    result =
        result.replace(
            /<iframe[\s\S]*?<\/iframe>/gi,
            ""
        );


    // Remove object
    result =
        result.replace(
            /<object[\s\S]*?<\/object>/gi,
            ""
        );


    // Remove embed
    result =
        result.replace(
            /<embed[^>]*>/gi,
            ""
        );


    // Remove events
    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    // Remove javascript
    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    // Upgrade Blogger image URLs
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
    // Convert lazy images
    // --------------------------------------------------------

    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            function(
                complete,
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
    // Remove duplicate featured image
    // --------------------------------------------------------

    if (
        featuredImage
    ) {

        const normalizedFeatured =
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

                    if (removed) {

                        return imageTag;

                    }


                    const match =
                        imageTag.match(
                            /\b(?:src|data-src)\s*=\s*["']([^"']+)["']/i
                        );


                    if (!match) {

                        return imageTag;

                    }


                    const imageUrl =
                        normalizeImageUrl(
                            match[1]
                        );


                    if (
                        imageUrl ===
                        normalizedFeatured
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
// LABEL
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

${escapeHtml(
    label
)}

</a>

`;

}


// ============================================================
// SINGLE POST PAGE
// ============================================================

function createSinglePage(
    post,
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
        post.labels.length > 0

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

<p
    class="no-related"
>
No related posts found.
</p>

</section>

`;


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
    href="https://filmstars.pages.dev${escapeHtml(
        post.url
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
    content="https://filmstars.pages.dev${escapeHtml(
        post.url
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
CONTENT
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
        3px 12px;

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
RELATED
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

    background:
        #111827;

    color:
        #aaa;

    text-align:
        center;

    padding:
        30px 15px;

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


    .related-grid {

        grid-template-columns:
            1fr;

    }


    .related-image img {

        height:
            auto;

        max-height:
            700px;

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
// ROUTER
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
    // NEVER INTERCEPT NORMAL STATIC PAGES
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
    // ONLY DATED BLOGGER POSTS
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


    try {

        // ----------------------------------------------------
        // Find current post
        // ----------------------------------------------------

        const post =
            await findPost(
                year,
                month,
                slug
            );


        if (!post) {

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
Post Not Found
</h1>

<p>
The requested Blogger post could not be found.
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


        // ----------------------------------------------------
        // GET RELATED POSTS
        // ----------------------------------------------------

        const related =
            await getRelatedPosts(
                post
            );


        console.log(
            "Related posts:",
            post.title,
            post.labels,
            related.length
        );


        // ----------------------------------------------------
        // CREATE PAGE
        // ----------------------------------------------------

        const html =
            createSinglePage(
                post,
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
            "Single post error:",
            error
        );


        return new Response(

            `<!DOCTYPE html>

<html>

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
