// ============================================================
// FILMSTARS - SINGLE BLOGGER POST HANDLER
// ============================================================
//
// Handles:
//
// /2011/03/example.html
// /2017/03/singer-ellie-goulding-at-harpers-bazaar.html
// /2026/06/example.html
//
// Source:
// https://tollywoodboost.blogspot.com
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
// ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (!Array.isArray(entry?.link)) {
        return "";
    }

    const item =
        entry.link.find(
            link =>
                link &&
                link.rel === "alternate" &&
                link.href
        );

    return item
        ? item.href
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
        String(imageUrl);


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
// POST IMAGE
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

function getLabels(entry) {

    if (!Array.isArray(entry?.category)) {
        return [];
    }

    return entry.category
        .map(
            category =>
                String(
                    category?.term || ""
                ).trim()
        )
        .filter(Boolean);
}


// ============================================================
// CREATE POST
// ============================================================

function createPost(
    entry
) {

    const content =
        getText(entry?.content) ||
        getText(entry?.summary);


    const bloggerUrl =
        getAlternateUrl(entry);


    return {

        title:
            getText(entry?.title),

        url:
            convertToFilmstarsUrl(
                bloggerUrl
            ),

        bloggerUrl:
            bloggerUrl,

        published:
            getText(entry?.published),

        updated:
            getText(entry?.updated),

        image:
            getPostImage(
                entry,
                content
            ),

        content:
            content,

        labels:
            getLabels(entry)

    };
}


// ============================================================
// MATCH BLOGGER PATH
// ============================================================

function isCorrectPost(
    entry,
    targetPath
) {

    const url =
        getAlternateUrl(entry);


    if (!url) {
        return false;
    }


    try {

        const pathname =
            new URL(url).pathname;


        return pathname ===
            targetPath;

    } catch {

        return false;
    }
}


// ============================================================
// FIND POST
// ============================================================

async function findPost(
    year,
    month,
    slug
) {

    const targetPath =
        `/${year}/${month}/${slug}.html`;


    // ========================================================
    // METHOD 1
    // Exact slug search
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


        if (response.ok) {

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

                if (
                    isCorrectPost(
                        entry,
                        targetPath
                    )
                ) {

                    return createPost(
                        entry
                    );
                }
            }
        }

    } catch (error) {

        console.error(
            "Slug search failed:",
            error
        );
    }


    // ========================================================
    // METHOD 2
    // Search by title/slug using Blogger q variations
    // ========================================================

    const searchTerms = [

        slug,

        slug.replace(
            /-/g,
            " "
        )

    ];


    for (
        const searchTerm
        of searchTerms
    ) {

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
                searchTerm
            );


            url.searchParams.set(
                "max-results",
                "100"
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
                continue;
            }


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

                if (
                    isCorrectPost(
                        entry,
                        targetPath
                    )
                ) {

                    return createPost(
                        entry
                    );
                }
            }

        } catch (error) {

            console.error(
                "Search fallback failed:",
                error
            );
        }
    }


    // ========================================================
    // METHOD 3
    // Fetch posts from the exact month.
    //
    // This is important for old posts.
    // ========================================================

    try {

        const start =
            `${year}-${month}-01T00:00:00Z`;


        const monthDate =
            new Date(
                Date.UTC(
                    Number(year),
                    Number(month),
                    0
                )
            );


        const lastDay =
            String(
                monthDate.getUTCDate()
            ).padStart(
                2,
                "0"
            );


        const end =
            `${year}-${month}-${lastDay}T23:59:59Z`;


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
            start
        );


        url.searchParams.set(
            "published-max",
            end
        );


        url.searchParams.set(
            "max-results",
            "500"
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


        if (response.ok) {

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

                if (
                    isCorrectPost(
                        entry,
                        targetPath
                    )
                ) {

                    return createPost(
                        entry
                    );
                }
            }
        }

    } catch (error) {

        console.error(
            "Monthly search failed:",
            error
        );
    }


    // ========================================================
    // NOT FOUND
    // ========================================================

    return null;
}


// ============================================================
// HTML ESCAPE
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
// CLEAN CONTENT
// ============================================================

function cleanPostContent(
    html
) {

    if (!html) {
        return "";
    }


    let result =
        String(html);


    // Remove dangerous elements
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


    // Remove event handlers
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


    // Blogger image formats
    result =
        upgradeAllImages(
            result
        );


    // --------------------------------------------------------
    // Lazy images
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
                    !/\ssrc\s*=/i.test(
                        attrs
                    )
                ) {

                    attrs +=
                        ` src="${escapeHtml(dataSrc[1])}"`;
                }


                // Remove fixed Blogger dimensions
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


                return `<img${attrs}>`;
            }
        );


    return result;
}


// ============================================================
// UPGRADE ALL IMAGES
// ============================================================

function upgradeAllImages(
    html
) {

    if (!html) {
        return "";
    }


    return html.replace(
        /((?:src|data-src)\s*=\s*["'])([^"']+)(["'])/gi,
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
}


// ============================================================
// REMOVE DUPLICATE FIRST IMAGE
// ============================================================

function removeDuplicateFeaturedImage(
    content,
    featuredImage
) {

    if (
        !content ||
        !featuredImage
    ) {
        return content;
    }


    const firstImage =
        content.match(
            /<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i
        );


    if (!firstImage) {
        return content;
    }


    const firstUrl =
        upgradeImageUrl(
            firstImage[1],
            "s1600"
        );


    const featuredUrl =
        upgradeImageUrl(
            featuredImage,
            "s1600"
        );


    if (
        firstUrl === featuredUrl
    ) {

        return content.replace(
            firstImage[0],
            ""
        );
    }


    return content;
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
// PAGE
// ============================================================

function createPage(
    post
) {

    let content =
        cleanPostContent(
            post.content
        );


    const featuredImage =
        post.image
            ? upgradeImageUrl(
                post.image,
                "s1600"
            )
            : "";


    // Remove same image if Blogger content starts with it
    content =
        removeDuplicateFeaturedImage(
            content,
            featuredImage
        );


    const labels =
        Array.isArray(post.labels) &&
        post.labels.length
            ? `

<div class="labels">

<strong>Labels:</strong>

${post.labels
    .map(createLabel)
    .join("")}

</div>

`
            : "";


    const description =
        escapeHtml(
            post.title
        );


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
    content="${description}"
>

<link
    rel="canonical"
    href="${escapeHtml(
        convertToFilmstarsUrl(
            post.bloggerUrl
        )
    )}"
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
    content="${escapeHtml(
        convertToFilmstarsUrl(
            post.bloggerUrl
        )
    )}"
>

${
    featuredImage
        ? `
<meta
    property="og:image"
    content="${escapeHtml(featuredImage)}"
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
    margin-left: 20px;
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
    line-height: 1.35;
    margin: 0 0 12px;
}

.post-date {
    color: #777;
    font-size: 14px;
    margin-bottom: 30px;
}

.featured-image {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 1100px;
    object-fit: contain;
    margin: 0 auto 35px;
    border-radius: 8px;
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
    max-height: 1100px;
    object-fit: contain;
    margin: 30px auto;
    border-radius: 7px;
}

.post-content figure {
    max-width: 100%;
    margin: 30px auto;
}

.post-content table {
    max-width: 100%;
    overflow-x: auto;
}

.post-content a {
    color: #2563eb;
}

.labels {
    border-top: 1px solid #eee;
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
    color: white !important;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
}

.footer {
    padding: 30px 15px;
    background: #111827;
    color: #aaa;
    text-align: center;
}

@media(max-width:600px) {

    .header-inner {
        padding: 17px 0;
    }

    .logo {
        font-size: 28px;
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
    featuredImage
        ? `
<img
    class="featured-image"
    src="${escapeHtml(featuredImage)}"
    alt="${escapeHtml(post.title)}"
>
`
        : ""
}


<div class="post-content">

${content}

</div>


${labels}

</article>

</main>


<footer class="footer">

© ${new Date().getFullYear()} Filmstars

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


    // --------------------------------------------------------
    // Never intercept normal pages
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Only /YYYY/MM/slug.html
    // --------------------------------------------------------

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


    // Validate month

    const monthNumber =
        Number(month);


    if (
        monthNumber < 1 ||
        monthNumber > 12
    ) {

        return context.next();
    }


    try {

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


        return new Response(

            createPage(post),

            {

                status: 200,

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

                status: 502,

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
