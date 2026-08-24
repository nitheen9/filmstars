// ============================================================
// FILMSTARS DYNAMIC BLOGGER POST HANDLER
// ============================================================


// ============================================================
// ESCAPE HTML
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
// SLUG
// ============================================================

function getSlugFromPath(
    pathname
) {

    const match =
        pathname.match(
            /^\/\d{4}\/\d{2}\/([^/]+)\.html$/
        );

    return match
        ? match[1]
        : "";

}


// ============================================================
// IMAGE URL
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
            /\/s\d+(-c)?\//g,
            "/s1600/"
        )

        .replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
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
        String(html);


    /*
     * Remove scripts
     */

    result =
        result.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );


    /*
     * Remove styles
     */

    result =
        result.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );


    /*
     * Remove iframe
     */

    result =
        result.replace(
            /<iframe[\s\S]*?<\/iframe>/gi,
            ""
        );


    /*
     * Remove object/embed
     */

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


    /*
     * Remove event handlers.
     */

    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    /*
     * Remove javascript links.
     */

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
            /\/s\d+(-c)?\//g,
            "/s1600/"
        );


    /*
     * Process IMG tags.
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


                /*
                 * data-src -> src
                 */

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
                        ' src="' +
                        dataSrc[1] +
                        '"';

                }


                /*
                 * Remove fixed width.
                 */

                attrs =
                    attrs.replace(
                        /\swidth=["'][^"']*["']/gi,
                        ""
                    );


                /*
                 * Remove fixed height.
                 */

                attrs =
                    attrs.replace(
                        /\sheight=["'][^"']*["']/gi,
                        ""
                    );


                /*
                 * Remove inline style.
                 */

                attrs =
                    attrs.replace(
                        /\sstyle=["'][^"']*["']/gi,
                        ""
                    );


                /*
                 * Upgrade src.
                 */

                attrs =
                    attrs.replace(
                        /(\ssrc=["'])([^"']+)(["'])/i,
                        function(
                            full,
                            start,
                            imageUrl,
                            end
                        ) {

                            return (
                                start +
                                upgradeImageUrl(
                                    imageUrl
                                ) +
                                end
                            );

                        }
                    );


                return (
                    "<img" +
                    attrs +
                    ">"
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

function createSinglePostHtml(
    post,
    previous,
    next,
    related
) {

    const labels =
        Array.isArray(
            post.labels
        ) &&
        post.labels.length > 0

            ? `

<div class="labels">

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


    const currentYear =
        new Date()
            .getFullYear();


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


<meta
    property="og:url"
    content="https://filmstars.pages.dev${escapeHtml(post.url)}"
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
    font-family: Arial, Helvetica, sans-serif;
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
    margin: 35px auto 70px;
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
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 4px 18px rgba(0,0,0,.06);
}

.post-title {
    font-size: 32px;
    line-height: 1.3;
    margin: 0 0 12px;
}

.post-date {
    color: #777;
    font-size: 14px;
    margin-bottom: 28px;
}


/*
 * IMPORTANT:
 *
 * Do not stretch or crop the main image.
 * This keeps the face and full body natural.
 */

.featured-image {
    display: block;

    width: auto;
    max-width: 100%;

    height: auto;

    max-height: 1200px;

    object-fit: contain;

    margin: 0 auto 35px;

    border-radius: 8px;

    background: #f2f2f2;
}


.post-content {
    font-size: 18px;
    line-height: 1.8;
}

.post-content p {
    margin: 0 0 22px;
}

.post-content img {
    display: block;

    width: auto;
    max-width: 100%;

    height: auto;

    max-height: 1200px;

    object-fit: contain;

    margin: 30px auto;

    border-radius: 7px;

    background: #f2f2f2;
}

.post-content figure {
    max-width: 100%;
    margin: 30px auto;
}

.post-content a {
    color: #2563eb;
}

.labels {
    border-top: 1px solid #eeeeee;

    margin-top: 30px;

    padding-top: 20px;

    line-height: 2.5;
}

.post-label {
    display: inline-block;

    margin: 4px;

    padding: 3px 12px;

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

    border: 1px solid #e5e7eb;

    border-radius: 10px;

    text-decoration: none;

    color: #222;
}

.post-navigation:hover {
    border-color: #2563eb;
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
    margin: 0 0 25px;
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

    border: 1px solid #e5e7eb;

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
    margin: 0 0 8px;

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

    padding: 7px 11px;

    background: #47164F;

    color: white;

    border-radius: 5px;

    text-decoration: none;

    font-size: 12px;

    font-weight: bold;
}

.footer {
    padding: 30px 15px;

    background: #111827;

    color: #aaa;

    text-align: center;
}

@media(max-width:800px) {

    .related-grid {
        grid-template-columns:
            repeat(2, 1fr);
    }

}

@media(max-width:600px) {

    .header-inner {
        padding: 17px 0;
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

    .post-content img {
        max-height: none;
    }

    .post-navigation-wrapper {
        grid-template-columns: 1fr;
    }

    .post-navigation.next {
        text-align: left;
    }

    .related-grid {
        grid-template-columns: 1fr;
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
    fetchpriority="high"
    decoding="async"
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
    .map(
        createRelatedCard
    )
    .join("")}

</div>

</section>


</main>


<footer class="footer">

© ${currentYear} Filmstars

</footer>


</body>

</html>`;

}


// ============================================================
// NOT FOUND
// ============================================================

function notFoundPage() {

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
    margin: 0;
    padding: 50px 20px;
    font-family: Arial, sans-serif;
    background: #f5f6f8;
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
    color: #47164F;
    font-weight: bold;
    text-decoration: none;
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


// ============================================================
// LOAD SINGLE POST FROM OUR EXISTING API
// ============================================================

async function loadSinglePost(
    requestUrl,
    slug
) {

    const apiUrl =
        new URL(
            "/blogger-posts",
            requestUrl.origin
        );


    apiUrl.searchParams.set(
        "slug",
        slug
    );


    const response =
        await fetch(
            apiUrl.toString(),
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
        return null;
    }


    const data =
        await response.json();


    if (
        !data.success ||
        !data.post
    ) {

        return null;

    }


    return data;

}


// ============================================================
// MAIN HANDLER
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


    /*
     * Never interfere with API.
     */

    if (
        pathname.startsWith(
            "/blogger-posts"
        )
    ) {

        return context.next();

    }


    /*
     * Only handle:
     *
     * /YYYY/MM/slug.html
     */

    const slug =
        getSlugFromPath(
            pathname
        );


    if (!slug) {

        return context.next();

    }


    try {

        const data =
            await loadSinglePost(
                requestUrl,
                slug
            );


        if (!data) {

            return notFoundPage();

        }


        const post =
            data.post;


        const previous =
            data.previous ||
            null;


        const next =
            data.next ||
            null;


        /*
         * Related posts.
         *
         * navigationPosts contains the
         * posts collected by the API.
         */

        const allPosts =
            Array.isArray(
                data.navigationPosts
            )
                ? data.navigationPosts
                : [];


        const currentLabels =
            new Set(
                Array.isArray(
                    post.labels
                )
                    ? post.labels
                    : []
            );


        const related =
            allPosts

                .filter(
                    item =>
                        item.url &&
                        item.url !==
                        post.url
                )

                .map(
                    item => {

                        let score = 0;

                        const labels =
                            Array.isArray(
                                item.labels
                            )
                                ? item.labels
                                : [];

                        for (
                            const label
                            of labels
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
                                item,

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


        /*
         * If related posts are fewer than 12,
         * add other posts.
         */

        if (
            related.length < 12
        ) {

            for (
                const item of allPosts
            ) {

                if (
                    related.length >= 12
                ) {

                    break;

                }


                if (
                    !item.url ||
                    item.url ===
                    post.url
                ) {

                    continue;

                }


                if (
                    related.some(
                        relatedPost =>
                            relatedPost.url ===
                            item.url
                    )
                ) {

                    continue;

                }


                related.push(
                    item
                );

            }

        }


        const html =
            createSinglePostHtml(
                post,
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


    } catch (error) {

        console.error(
            "Filmstars single post error:",
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
