const BLOG_URL = "https://tollywoodboost.blogspot.com/";
const BLOG_FEED = "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// TEXT
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

        return `/${match[1]}/${match[2]}/${match[3]}.html`;

    } catch {

        return "";
    }
}


// ============================================================
// GET SLUG
// FIXED FOR BOTH ABSOLUTE AND RELATIVE URLS
// ============================================================

function getSlug(url) {

    if (!url) {
        return "";
    }

    try {

        let pathname = "";

        if (
            url.startsWith("http://") ||
            url.startsWith("https://")
        ) {

            pathname =
                new URL(url).pathname;

        } else {

            pathname = url;

        }

        const match =
            pathname.match(
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

async function fetchBlogger(
    startIndex = 1,
    maxResults = 20
) {

    const feedUrl =
        `${BLOG_FEED}?alt=json&start-index=${startIndex}&max-results=${maxResults}`;


    const response =
        await fetch(
            feedUrl,
            {
                headers: {
                    "User-Agent":
                        "Filmstars Pages"
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
// BLOGGER API
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


    if (
        !Number.isFinite(startIndex) ||
        startIndex < 1
    ) {

        startIndex = 1;

    }


    if (
        !Number.isFinite(maxResults) ||
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
            maxResults
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
                    "s800"
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

            success: true,

            blog:
                "Tollywood Boost",

            source:
                BLOG_URL,

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
// FETCH MANY POSTS
// Used for single post, previous/next and related posts
// ============================================================

async function getPostsForSinglePage() {

    const data =
        await fetchBlogger(
            1,
            150
        );


    const entries =
        Array.isArray(
            data.feed?.entry
        )
            ? data.feed.entry
            : [];


    return entries.map(
        entry =>
            createPost(
                entry,
                "s1600"
            )
    );

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(value || "")

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

function formatDate(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


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
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


// ============================================================
// CLEAN BLOGGER CONTENT
// ============================================================

function cleanPostContent(html) {

    if (!html) {
        return "";
    }


    let result = html;


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


    // Remove iframe
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


    // Remove event handlers
    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    // Remove javascript URLs
    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    // Upgrade Blogger image URLs
    result =
        result.replace(
            /\/s72-c\//g,
            "/s1600/"
        );


    result =
        result.replace(
            /\/s72\//g,
            "/s1600/"
        );


    result =
        result.replace(
            /\/w72-h72-p-k-no-nu\//g,
            "/s1600/"
        );


    result =
        result.replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
        );


    // Fix images
    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            function(
                completeTag,
                attributes
            ) {

                let attrs =
                    attributes;


                const dataSrc =
                    attrs.match(
                        /data-src=["']([^"']+)["']/i
                    );


                if (
                    dataSrc &&
                    !/\ssrc=/i.test(attrs)
                ) {

                    attrs +=
                        ` src="${dataSrc[1]}"`;

                }


                // Remove fixed width
                attrs =
                    attrs.replace(
                        /\swidth=["'][^"']*["']/gi,
                        ""
                    );


                // Remove fixed height
                attrs =
                    attrs.replace(
                        /\sheight=["'][^"']*["']/gi,
                        ""
                    );


                // Remove inline style
                attrs =
                    attrs.replace(
                        /\sstyle=["'][^"']*["']/gi,
                        ""
                    );


                return `<img${attrs}>`;

            }
        );


    // Upgrade image src
    result =
        result.replace(
            /(<img[^>]+(?:src|data-src)=["'])([^"']+)(["'])/gi,
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


    return result;
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
            href="/blog?label=${encodeURIComponent(label)}"
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

        <article class="related-card">


            <a
                class="related-image"
                href="${escapeHtml(post.url)}"
            >

                ${
                    post.image
                        ? `

                            <img
                                src="${escapeHtml(post.image)}"
                                alt="${escapeHtml(post.title)}"
                                loading="lazy"
                            >

                          `
                        : ""
                }

            </a>


            <div class="related-info">


                <h3>

                    <a
                        href="${escapeHtml(post.url)}"
                    >

                        ${escapeHtml(
                            post.title
                        )}

                    </a>

                </h3>


                <div class="related-date">

                    ${escapeHtml(
                        formatDate(
                            post.published
                        )
                    )}

                </div>


                <a
                    class="read-more"
                    href="${escapeHtml(post.url)}"
                >

                    Read More

                </a>


            </div>


        </article>

    `;
}


// ============================================================
// SINGLE POST PAGE
// ============================================================

function createSinglePostPage(
    post,
    previous,
    next,
    related
) {

    const labels =
        post.labels.length > 0

            ? `

                <div class="labels">

                    <strong>
                        Labels:
                    </strong>

                    ${post.labels
                        .map(createLabel)
                        .join("")}

                </div>

              `

            : "";


    const previousHtml =
        previous

            ? `

                <a
                    class="post-navigation previous"
                    href="${escapeHtml(previous.url)}"
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


    const nextHtml =
        next

            ? `

                <a
                    class="post-navigation next"
                    href="${escapeHtml(next.url)}"
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
                    class="post-navigation disabled"
                >

                    <span>
                        Next Post →
                    </span>

                    <strong>
                        No next post
                    </strong>

                </div>

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
${escapeHtml(post.title)} | Filmstars
</title>


<meta
    name="description"
    content="${escapeHtml(post.title)}"
>


<meta
    property="og:title"
    content="${escapeHtml(post.title)}"
>


<meta
    property="og:type"
    content="article"
>


${
    post.image
        ? `

            <meta
                property="og:image"
                content="${escapeHtml(post.image)}"
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

    background: #f5f6f8;

    color: #222;

}


.header {

    background: #fe5301;

    color: #fdfdff;

}


.header-inner {

    width: 92%;

    max-width: 1200px;

    min-height: 68px;

    margin: auto;

    display: flex;

    align-items: center;

    justify-content: space-between;

}


.logo {

    font-size: 36px;

    font-weight: bold;

}


.nav a {

    color: white;

    text-decoration: none;

    margin-left: 22px;

}


.main {

    width: 92%;

    max-width: 1050px;

    margin:
        35px auto 70px;

}


.back {

    display: inline-block;

    margin-bottom: 18px;

    color: #47164F;

    text-decoration: none;

    font-weight: bold;

}


.post {

    background: white;

    border:
        1px solid #e5e7eb;

    border-radius: 12px;

    padding: 30px;

    box-shadow:
        0 4px 18px rgba(0,0,0,.06);

}


.post-title {

    font-size: 28px;

    line-height: 1.25;

    margin:
        0 0 12px;

}


.post-date {

    color: #777;

    font-size: 14px;

    margin-bottom: 28px;

}


/*
 * Main image:
 * Keep original aspect ratio.
 * Do NOT crop faces/body.
 */

.featured-image {

    display: block;

    width: auto;

    max-width: 100%;

    height: auto;

    max-height: 1100px;

    object-fit: contain;

    margin:
        0 auto 35px;

    border-radius: 8px;

    background: #f2f2f2;

}


.post-content {

    font-size: 18px;

    line-height: 1.8;

}


.post-content p {

    margin:
        0 0 22px;

}


.post-content img {

    display: block;

    width: auto;

    max-width: 100%;

    height: auto;

    max-height: 1100px;

    object-fit: contain;

    margin:
        30px auto;

    border-radius: 7px;

}


.post-content figure {

    max-width: 100%;

    margin:
        30px auto;

}


.post-content a {

    color: #2563eb;

}


.labels {

    border-top:
        1px solid #eeeeee;

    margin-top: 30px;

    padding-top: 20px;

    line-height: 2.5;

}


.post-label {

    display: inline-block;

    margin:
        4px;

    padding:
        3px 12px;

    border-radius: 20px;

    background: #47164F;

    color: #fdfdff;

    text-decoration: none;

    font-size: 13px;
    font-weight: 600;

}


.post-navigation-wrapper {

    display: grid;

    grid-template-columns:
        1fr 1fr;

    gap: 20px;

    margin-top: 30px;

}


.post-navigation {

    display: flex;

    flex-direction: column;

    gap: 8px;

    padding: 18px;

    background: white;

    border:
        1px solid #e5e7eb;

    border-radius: 10px;

    text-decoration: none;

    color: #222;

}


.post-navigation:hover {

    border-color:
        #2563eb;

}


.post-navigation span {

    color: #47164F;

    font-size: 13px;

    font-weight: bold;

}


.post-navigation strong {

    line-height: 1.45;

}


.post-navigation.next {

    text-align: right;

}


.disabled {

    opacity: .45;

}


.related {

    margin-top: 55px;

}


.related h2 {

    margin:
        0 0 25px;

    font-size: 29px;

}


.related-grid {

    display: grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap: 22px;

}


.related-card {

    overflow: hidden;

    background: white;

    border:
        1px solid #e5e7eb;

    border-radius: 10px;

    box-shadow:
        0 3px 12px rgba(0,0,0,.05);

}


.related-image {

    display: block;

    background: #f2f2f2;

}


.related-image img {

    display: block;

    width: 100%;

    height: 300px;

    object-fit: fill;

    background: #f2f2f2;

}


.related-info {

    padding: 15px;

}


.related-info h3 {

    margin:
        0 0 8px;

    font-size: 17px;

    line-height: 1.4;

}


.related-info h3 a {

    color: #222;

    text-decoration: none;

}


.related-date {

    color: #777;

    font-size: 12px;

    margin-bottom: 12px;

}


.read-more {

    display: inline-block;

    padding:
        7px 11px;

    background: #47164F;

    color: white;

    border-radius: 5px;

    text-decoration: none;

    font-size: 12px;

    font-weight: bold;

}


.footer {

    padding:
        30px 15px;

    background: #111827;

    color: #aaa;

    text-align: center;

}


@media (
    max-width: 800px
) {

    .related-grid {

        grid-template-columns:
            repeat(2, 1fr);

    }

}


@media (
    max-width: 600px
) {

    .header-inner {

        padding:
            17px 0;

        flex-direction:
            column;

        gap: 14px;

    }


    .nav a {

        margin:
            0 8px;

    }


    .main {

        width: 94%;

    }


    .post {

        padding: 18px;

    }


    .post-title {

        font-size: 24px;

    }


    .post-content {

        font-size: 16px;

    }


    .featured-image {

        width: 100%;

        max-height: none;

    }


    .post-content img {

        max-height: none;

    }


    .post-navigation-wrapper {

        grid-template-columns:
            1fr;

    }


    .post-navigation.next {

        text-align: left;

    }


    .related-grid {

        grid-template-columns:
            1fr;

    }


    .related-image img {

        height: auto;

        max-height: 700px;

    }

}

</style>

</head>


<body>


<header class="header">

<div class="header-inner">

<div class="logo">
Film Stars
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

${escapeHtml(post.title)}

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
    post.image
        ? `

            <img
                class="featured-image"
                src="${escapeHtml(post.image)}"
                alt="${escapeHtml(post.title)}"
            >

          `
        : ""
}


<div class="post-content">

${cleanPostContent(
    post.content
)}

</div>


${labels}


</article>


<div class="post-navigation-wrapper">

${previousHtml}

${nextHtml}

</div>


<section class="related">

<h2>
Related Posts
</h2>


<div class="related-grid">

${related
    .map(createRelatedCard)
    .join("")}

</div>

</section>


</main>


<footer class="footer">

© ${new Date().getFullYear()} Filmstars

</footer>


</body>

</html>`;
}


// ============================================================
// SINGLE POST
// ============================================================

async function singlePostPage(
    requestUrl
) {

    const pathname =
        requestUrl.pathname;


    /*
     * This matches:
     *
     * /2026/06/marathi-beautiful-actress-ankita.html
     */

    const match =
        pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );


    if (!match) {

        return null;

    }


    const year =
        match[1];


    const month =
        match[2];


    const slug =
        match[3];


    console.log(
        "Looking for post:",
        year,
        month,
        slug
    );


    const posts =
        await getPostsForSinglePage();


    /*
     * Find by complete Filmstars path first.
     */

    let currentIndex =
        posts.findIndex(
            post =>
                post.url ===
                pathname
        );


    /*
     * If not found, find by slug.
     */

    if (
        currentIndex === -1
    ) {

        currentIndex =
            posts.findIndex(
                post =>
                    getSlug(
                        post.url
                    ) === slug
            );

    }


    /*
     * Last fallback:
     * compare the Blogger URL pathname.
     */

    if (
        currentIndex === -1
    ) {

        currentIndex =
            posts.findIndex(
                post => {

                    try {

                        const bloggerPath =
                            new URL(
                                post.bloggerUrl
                            ).pathname;


                        return (
                            bloggerPath ===
                            pathname
                        );

                    } catch {

                        return false;

                    }

                }
            );

    }


    if (
        currentIndex === -1
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
                    font-family: Arial, sans-serif;
                    background: #f5f6f8;
                    margin: 0;
                    padding: 50px 20px;
                    text-align: center;
                }

                .box {
                    max-width: 700px;
                    margin: auto;
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                }

                a {
                    color: #2563eb;
                    text-decoration: none;
                    font-weight: bold;
                }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>
                        Post Not Found
                    </h1>

                    <p>
                        The requested Filmstars post
                        could not be found.
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

                status: 404,

                headers: {

                    "Content-Type":
                        "text/html; charset=UTF-8",

                    "Cache-Control":
                        "no-cache"

                }

            }

        );

    }


    const current =
        posts[currentIndex];


    /*
     * Feed order:
     *
     * newest
     * ↓
     * oldest
     *
     * Therefore:
     *
     * Next = newer
     * Previous = older
     */

    const previous =
        currentIndex <
        posts.length - 1

            ? posts[
                currentIndex + 1
            ]

            : null;


    const next =
        currentIndex > 0

            ? posts[
                currentIndex - 1
            ]

            : null;


    /*
     * RELATED POSTS
     */

    const currentLabels =
        new Set(
            current.labels
        );


    const related =
        posts

            .filter(
                post =>
                    post.url !==
                    current.url
            )

            .map(
                post => {

                    let score = 0;


                    for (
                        const label
                        of post.labels
                    ) {

                        if (
                            currentLabels.has(
                                label
                            )
                        ) {

                            score++;

                        }

                    }


                    return {
                        post,
                        score
                    };

                }
            )

            .sort(
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
                        ) -
                        new Date(
                            a.post.published
                        )
                    );

                }
            )

            .slice(
                0,
                12
            )

            .map(
                item =>
                    item.post
            );


    const html =
        createSinglePostPage(
            current,
            previous,
            next,
            related
        );


    return new Response(

        html,

        {

            status: 200,

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8",

                "Cache-Control":
                    "public, max-age=300, s-maxage=300"

            }

        }

    );

}


// ============================================================
// MAIN CLOUDFLARE HANDLER
// ============================================================

export async function onRequest(
    context
) {

    const requestUrl =
        new URL(
            context.request.url
        );


    /*
     * BLOGGER API
     */

    if (
        requestUrl.pathname ===
            "/api/blogger" ||
        requestUrl.pathname ===
            "/api/blogger/"
    ) {

        try {

            return await bloggerApi(
                requestUrl
            );

        } catch (error) {

            console.error(
                "Blogger API error:",
                error
            );


            return new Response(

                JSON.stringify({

                    success: false,

                    error:
                        "Unable to load Blogger posts."

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


    /*
     * SINGLE POST
     */

    if (
        /^\/\d{4}\/\d{2}\/[^/]+\.html$/
            .test(
                requestUrl.pathname
            )
    ) {

        try {

            return await singlePostPage(
                requestUrl
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
                        Error | Filmstars
                    </title>

                </head>

                <body>

                    <h1>
                        Unable to load post
                    </h1>

                    <p>
                        Please try again later.
                    </p>

                    <p>
                        <a href="/blog">
                            ← Back to Blog
                        </a>
                    </p>

                </body>

                </html>`,

                {

                    status: 500,

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


    /*
     * Normal files:
     *
     * index.html
     * blog.html
     * etc.
     */

    return context.next();

}
