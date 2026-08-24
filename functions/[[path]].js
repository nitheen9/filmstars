const BLOG_URL =
    "https://tollywoodboost.blogspot.com";

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

function convertUrl(
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
// IMAGE
// ============================================================

function upgradeImageUrl(
    url
) {

    if (!url) {
        return "";
    }

    return url

        .replace(
            /\/s72-c\//g,
            "/s1600/"
        )

        .replace(
            /\/s72\//g,
            "/s1600/"
        )

        .replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
        )

        .replace(
            /\/s\d+\//g,
            "/s1600/"
        );
}


// ============================================================
// IMAGE FROM ENTRY
// ============================================================

function getPostImage(
    entry,
    content
) {

    if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url
        );
    }


    if (content) {

        let match =
            content.match(
                /data-src=["']([^"']+)["']/i
            );


        if (match) {

            return upgradeImageUrl(
                match[1]
            );
        }


        match =
            content.match(
                /<img[^>]+src=["']([^"']+)["']/i
            );


        if (match) {

            return upgradeImageUrl(
                match[1]
            );
        }
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
            entry.category
        )
    ) {

        return [];
    }


    return entry.category

        .map(
            category =>
                category.term || ""
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
            entry.content
        ) ||
        getText(
            entry.summary
        );


    const bloggerUrl =
        getAlternateUrl(
            entry
        );


    return {

        title:
            getText(
                entry.title
            ),

        url:
            convertUrl(
                bloggerUrl
            ),

        bloggerUrl:
            bloggerUrl,

        published:
            getText(
                entry.published
            ),

        updated:
            getText(
                entry.updated
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
// FETCH BLOGGER FEED
// ============================================================

async function fetchFeed(
    startIndex = 1,
    maxResults = 150
) {

    const url =
        new URL(
            BLOG_FEED
        );


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
// FETCH ALL AVAILABLE POSTS IN BATCHES
//
// This avoids the old "only first 150 posts" problem.
//
// For a single post we keep requesting batches until
// the requested post is found.
// ============================================================

async function findPostByPath(
    pathname
) {

    let startIndex = 1;

    const batchSize = 150;

    const allPosts = [];


    for (
        let batch = 0;
        batch < 20;
        batch++
    ) {

        const data =
            await fetchFeed(
                startIndex,
                batchSize
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


        allPosts.push(
            ...posts
        );


        const found =
            posts.findIndex(
                post =>
                    post.url ===
                    pathname
            );


        if (
            found !== -1
        ) {

            return {

                posts:
                    allPosts,

                index:
                    allPosts.length -
                    posts.length +
                    found
            };
        }


        /*
         * If Blogger returned less than
         * the requested batch size, there
         * are no more posts.
         */

        if (
            entries.length <
            batchSize
        ) {

            break;
        }


        startIndex +=
            batchSize;
    }


    return {

        posts:
            allPosts,

        index:
            -1
    };
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
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


// ============================================================
// CLEAN CONTENT
// ============================================================

function cleanContent(
    html
) {

    if (!html) {
        return "";
    }


    let result =
        html;


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


    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    /*
     * Upgrade Blogger images.
     */

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
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
        );


    result =
        result.replace(
            /\/s\d+\//g,
            "/s1600/"
        );


    /*
     * Remove width/height/style
     * so images don't get distorted.
     */

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
                        /data-src=["']([^"']+)["']/i
                    );


                if (
                    dataSrc &&
                    !/\ssrc=/i.test(
                        attrs
                    )
                ) {

                    attrs +=
                        ` src="${dataSrc[1]}"`;
                }


                attrs =
                    attrs.replace(
                        /\swidth=["'][^"']*["']/gi,
                        ""
                    );


                attrs =
                    attrs.replace(
                        /\sheight=["'][^"']*["']/gi,
                        ""
                    );


                attrs =
                    attrs.replace(
                        /\sstyle=["'][^"']*["']/gi,
                        ""
                    );


                return `<img${attrs}>`;
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

function relatedCard(
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
    decoding="async"
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

${escapeHtml(post.title)}

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
// SINGLE POST HTML
// ============================================================

function createSinglePage(
    current,
    previous,
    next,
    related
) {

    const labels =
        current.labels &&
        current.labels.length
            ? `

<div class="labels">

<strong>
Labels:
</strong>

${current.labels
    .map(
        createLabel
    )
    .join("")}

</div>

`
            : "";


    const previousHtml =
        previous
            ? `

<a
    class="post-navigation"
    href="${escapeHtml(previous.url)}"
>

<span>
← Previous Post
</span>

<strong>
${escapeHtml(previous.title)}
</strong>

</a>

`
            : `

<div class="post-navigation disabled">

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
${escapeHtml(next.title)}
</strong>

</a>

`
            : `

<div class="post-navigation disabled">

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
${escapeHtml(current.title)} | Filmstars
</title>


<meta
    name="description"
    content="${escapeHtml(current.title)}"
>


<link
    rel="canonical"
    href="https://filmstars.pages.dev${escapeHtml(current.url)}"
>


<meta
    property="og:title"
    content="${escapeHtml(current.title)}"
>


<meta
    property="og:type"
    content="article"
>


${
    current.image
        ? `
<meta
    property="og:image"
    content="${escapeHtml(current.image)}"
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

    color: white;
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


.logo a {

    color: white;

    text-decoration: none;
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

    font-size: 32px;

    line-height: 1.3;

    margin:
        0 0 12px;
}


.post-date {

    color: #777;

    font-size: 14px;

    margin-bottom: 28px;
}


/*
 * IMPORTANT:
 *
 * contain preserves the original
 * face/body proportions.
 */

.featured-image {

    display: block;

    width: 100%;

    max-width: 900px;

    height: auto;

    max-height: 1200px;

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


.post-content img {

    display: block;

    width: auto;

    max-width: 100%;

    height: auto;

    max-height: 1200px;

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
        4px 12px;

    border-radius: 20px;

    background: #47164F;

    color: white;

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

    object-fit: contain;

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


@media (max-width: 800px) {

    .related-grid {

        grid-template-columns:
            repeat(2, 1fr);
    }

}


@media (max-width: 600px) {

    .header-inner {

        padding:
            17px 0;

        gap: 14px;
    }


    .logo {

        font-size: 28px;
    }


    .main {

        width: 94%;
    }


    .post {

        padding: 18px;
    }


    .post-title {

        font-size: 25px;
    }


    .post-content {

        font-size: 16px;
    }


    .featured-image {

        width: 100%;

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

        max-height: 800px;
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
    current.title
)}

</h1>


<div class="post-date">

Published
${escapeHtml(
    formatDate(
        current.published
    )
)}

</div>


${
    current.image
        ? `

<img
    class="featured-image"
    src="${escapeHtml(current.image)}"
    alt="${escapeHtml(current.title)}"
    decoding="async"
>

`
        : ""
}


<div class="post-content">

${cleanContent(
    current.content
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
    .map(
        relatedCard
    )
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
// SINGLE POST HANDLER
// ============================================================

async function singlePost(
    requestUrl
) {

    const pathname =
        requestUrl.pathname;


    const match =
        pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );


    if (!match) {

        return null;
    }


    const result =
        await findPostByPath(
            pathname
        );


    const posts =
        result.posts;


    const currentIndex =
        result.index;


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

</head>

<body>

<div
    style="
        max-width:700px;
        margin:60px auto;
        padding:40px;
        font-family:Arial;
        text-align:center;
    "
>

<h1>
Post Not Found
</h1>

<p>
The requested Filmstars post could not be found.
</p>

<a href="/blog">
← Back to Blog
</a>

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
     * Blogger feed is newest → oldest.
     *
     * Previous = older
     * Next = newer
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
     * Related posts:
     * match labels first.
     */

    const currentLabels =
        new Set(
            current.labels || []
        );


    const related =
        posts

            .filter(
                post =>
                    post.url &&
                    post.url !==
                    current.url
            )

            .map(
                post => {

                    let score = 0;


                    for (
                        const label
                        of (
                            post.labels || []
                        )
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
        createSinglePage(
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
// CLOUDFLARE HANDLER
// ============================================================

export async function onRequest(
    context
) {

    const requestUrl =
        new URL(
            context.request.url
        );


    /*
     * Single Blogger-style post.
     */

    if (
        /^\/\d{4}\/\d{2}\/[^/]+\.html$/
            .test(
                requestUrl.pathname
            )
    ) {

        try {

            return await singlePost(
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
Filmstars Error
</title>

</head>

<body>

<div
    style="
        max-width:700px;
        margin:60px auto;
        padding:30px;
        font-family:Arial;
        text-align:center;
    "
>

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

</div>

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
     * Everything else goes to
     * normal Cloudflare Pages files.
     */

    return context.next();
}
