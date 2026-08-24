// ============================================================
// BLOGGER SETTINGS
// ============================================================

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
// ALTERNATE URL
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
// IMAGE
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
// FETCH ALL POSTS IN BATCHES
//
// IMPORTANT:
// Do NOT request 850+ posts in one Blogger request.
//
// Blogger has limits.
// We fetch batches of 100.
//
// Used only for single-post lookup,
// previous/next and related posts.
// ============================================================

async function getAllPosts() {

    const allPosts = [];

    const seen = new Set();

    let start = 1;

    const batchSize = 100;

    const maxBatches = 20;


    for (
        let batch = 0;
        batch < maxBatches;
        batch++
    ) {

        const url =
            BLOG_FEED +
            "?alt=json" +
            "&start-index=" +
            start +
            "&max-results=" +
            batchSize;


        const response =
            await fetch(
                url,
                {
                    headers: {
                        "User-Agent":
                            "Filmstars Pages"
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


        const data =
            await response.json();


        const entries =
            Array.isArray(
                data.feed?.entry
            )
                ? data.feed.entry
                : [];


        if (
            entries.length === 0
        ) {

            break;

        }


        for (
            const entry
            of entries
        ) {

            const post =
                createPost(
                    entry,
                    "s1600"
                );


            if (
                !post.url ||
                seen.has(
                    post.url
                )
            ) {

                continue;

            }


            seen.add(
                post.url
            );


            allPosts.push(
                post
            );

        }


        if (
            entries.length <
            batchSize
        ) {

            break;

        }


        start +=
            entries.length;

    }


    return allPosts;

}


// ============================================================
// ESCAPE
// ============================================================

function escapeHtml(value) {

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
// CLEAN BLOGGER CONTENT
// ============================================================

function cleanPostContent(
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


    // Convert Blogger images to responsive images

    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            function(
                tag,
                attrs
            ) {

                let a =
                    attrs;


                const original =
                    a.match(
                        /data-original=["']([^"']+)["']/i
                    );


                const dataSrc =
                    a.match(
                        /data-src=["']([^"']+)["']/i
                    );


                if (
                    original &&
                    !/\ssrc=/i.test(a)
                ) {

                    a +=
                        ' src="' +
                        original[1] +
                        '"';

                }
                else if (
                    dataSrc &&
                    !/\ssrc=/i.test(a)
                ) {

                    a +=
                        ' src="' +
                        dataSrc[1] +
                        '"';

                }


                a =
                    a.replace(
                        /\swidth=["'][^"']*["']/gi,
                        ""
                    );


                a =
                    a.replace(
                        /\sheight=["'][^"']*["']/gi,
                        ""
                    );


                a =
                    a.replace(
                        /\sstyle=["'][^"']*["']/gi,
                        ""
                    );


                return (
                    "<img" +
                    a +
                    ">"
                );

            }
        );


    result =
        result.replace(
            /(<img[^>]+src=["'])([^"']+)(["'])/gi,
            function(
                full,
                before,
                image,
                after
            ) {

                return (
                    before +
                    upgradeImageUrl(
                        image,
                        "s1600"
                    ) +
                    after
                );

            }
        );


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

        <article
            class="related-card"
        >

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


            <div
                class="related-info"
            >

                <h3>

                    <a
                        href="${escapeHtml(post.url)}"
                    >
                        ${escapeHtml(post.title)}
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

function createSinglePostPage(
    post,
    previous,
    next,
    related
) {

    const labels =
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
${escapeHtml(post.title)}
 | Filmstars
</title>

<meta
    name="description"
    content="${escapeHtml(post.title)}"
>

<link
    rel="canonical"
    href="https://filmstars.pages.dev${escapeHtml(post.url)}"
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
    box-sizing:
        border-box;
}

body {

    margin:
        0;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:
        #f5f6f8;

    color:
        #222;

}

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

.featured-image {

    display:
        block;

    width:
        100%;

    max-width:
        900px;

    height:
        auto;

    max-height:
        none;

    object-fit:
        contain;

    margin:
        0 auto 35px;

    border-radius:
        8px;

}

.post-content {

    font-size:
        18px;

    line-height:
        1.8;

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

    margin:
        30px auto;

    border-radius:
        7px;

}

.post-content a {

    color:
        #2563eb;

}

.labels {

    border-top:
        1px solid #eee;

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
        white;

    text-decoration:
        none;

    font-size:
        13px;

}

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
        18px;

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

}

.post-navigation span {

    color:
        #47164F;

    font-size:
        13px;

    font-weight:
        bold;

}

.post-navigation strong {

    line-height:
        1.45;

}

.post-navigation.next {

    text-align:
        right;

}

.disabled {

    opacity:
        .45;

}

.related {

    margin-top:
        55px;

}

.related h2 {

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

}

.related-image {

    display:
        block;

}

.related-image img {

    display:
        block;

    width:
        100%;

    height:
        300px;

    object-fit:
        cover;

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

@media(max-width:800px) {

    .related-grid {

        grid-template-columns:
            repeat(2,1fr);

    }

}

@media(max-width:600px) {

    .post {

        padding:
            18px;

    }

    .post-title {

        font-size:
            25px;

    }

    .post-content {

        font-size:
            16px;

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


<div
    class="post-navigation-wrapper"
>

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
        createRelatedCard
    )
    .join("")}

</div>

</section>


</main>


<footer class="footer">

© ${new Date().getFullYear()}
Filmstars

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


    const match =
        pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );


    if (!match) {
        return null;
    }


    const slug =
        match[3];


    const posts =
        await getAllPosts();


    let currentIndex =
        posts.findIndex(
            post =>
                getSlug(
                    post.url
                ) === slug
        );


    if (
        currentIndex === -1
    ) {

        return new Response(

            `<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Post Not Found | Filmstars
</title>

<style>

body {

    font-family:
        Arial;

    background:
        #f5f6f8;

    text-align:
        center;

    padding:
        60px 20px;

}

.box {

    background:
        white;

    max-width:
        700px;

    margin:
        auto;

    padding:
        40px;

    border-radius:
        12px;

}

a {

    color:
        #2563eb;

    text-decoration:
        none;

    font-weight:
        bold;

}

</style>

</head>

<body>

<div class="box">

<h1>
Post Not Found
</h1>

<p>
The requested Filmstars post could not be found.
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


    const current =
        posts[currentIndex];


    // Feed is newest → oldest

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


    // ========================================================
    // RELATED POSTS
    // ========================================================

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

                        post:
                            post,

                        score:
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


    return new Response(

        createSinglePostPage(
            current,
            previous,
            next,
            related
        ),

        {

            status:
                200,

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


    // --------------------------------------------------------
    // /api/blogger
    //
    // We proxy the existing blogger-posts function here.
    // --------------------------------------------------------

    if (
        requestUrl.pathname ===
            "/api/blogger" ||
        requestUrl.pathname ===
            "/api/blogger/"
    ) {

        try {

            const startIndex =
                parseInt(
                    requestUrl.searchParams.get(
                        "start-index"
                    ) || "1",
                    10
                );


            const maxResults =
                parseInt(
                    requestUrl.searchParams.get(
                        "max-results"
                    ) || "20",
                    10
                );


            const label =
                requestUrl.searchParams.get(
                    "label"
                ) || "";


            let start =
                Number.isFinite(
                    startIndex
                ) &&
                startIndex > 0
                    ? startIndex
                    : 1;


            let max =
                Number.isFinite(
                    maxResults
                ) &&
                maxResults > 0
                    ? Math.min(
                        maxResults,
                        50
                    )
                    : 20;


            const params =
                new URLSearchParams();


            params.set(
                "start-index",
                String(start)
            );


            params.set(
                "max-results",
                String(max)
            );


            if (label) {

                params.set(
                    "label",
                    label
                );

            }


            const endpoint =
                new URL(
                    "/blogger-posts",
                    requestUrl.origin
                );


            endpoint.search =
                params.toString();


            const response =
                await fetch(
                    endpoint.toString()
                );


            return new Response(
                await response.text(),
                {
                    status:
                        response.status,

                    headers: {
                        "Content-Type":
                            "application/json; charset=UTF-8"
                    }
                }
            );

        }
        catch (error) {

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
                            "application/json; charset=UTF-8"

                    }

                }

            );

        }

    }


    // --------------------------------------------------------
    // SINGLE POST
    // --------------------------------------------------------

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

        }
        catch (error) {

            console.error(
                "Single post error:",
                error
            );


            return new Response(

                "Unable to load post.",

                {

                    status:
                        500,

                    headers: {

                        "Content-Type":
                            "text/plain; charset=UTF-8"

                    }

                }

            );

        }

    }


    return context.next();

}
