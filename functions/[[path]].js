// ============================================================
// FILMSTARS - SINGLE BLOG POST HANDLER
// ============================================================
//
// Handles:
// /2011/03/example.html
// /2017/03/singer-ellie-goulding-at-harpers-bazaar.html
// /2026/06/example.html
//
// IMPORTANT:
// We search Blogger by the exact post URL.
// We do NOT only download the latest 150 posts.
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
        return value.$t || "";
    }

    return "";
}


// ============================================================
// BLOGGER ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (
        !Array.isArray(entry.link)
    ) {
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

    } catch {

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

    return String(url)

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
// IMAGE FROM POST
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
            entry.media$thumbnail.url,
            "s1600"
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
                "s1600"
            );
        }


        match =
            content.match(
                /<img[^>]+src=["']([^"']+)["']/i
            );

        if (match) {

            return upgradeImageUrl(
                match[1],
                "s1600"
            );
        }
    }


    return "";
}


// ============================================================
// LABELS
// ============================================================

function getLabels(entry) {

    if (
        !Array.isArray(entry.category)
    ) {
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
    entry
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
                content
            ),

        content:
            content,

        labels:
            getLabels(entry)
    };
}


// ============================================================
// FETCH BLOGGER POST BY EXACT URL
// ============================================================
//
// Blogger's feed supports a search query.
// We use the slug as the search query.
//
// Then we verify the complete Blogger pathname.
//
// This works for old posts as well.
// ============================================================

async function findPost(
    year,
    month,
    slug
) {

    const targetPath =
        `/${year}/${month}/${slug}.html`;


    // --------------------------------------------------------
    // First attempt:
    // search Blogger feed
    // --------------------------------------------------------

    const searchUrl =
        new URL(
            BLOG_FEED
        );


    searchUrl.searchParams.set(
        "alt",
        "json"
    );

    searchUrl.searchParams.set(
        "q",
        slug
    );

    searchUrl.searchParams.set(
        "max-results",
        "20"
    );


    const response =
        await fetch(
            searchUrl.toString(),
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
                data.feed?.entry
            )
                ? data.feed.entry
                : [];


        for (
            const entry
            of entries
        ) {

            const post =
                createPost(
                    entry
                );


            if (!post.bloggerUrl) {
                continue;
            }


            try {

                const bloggerPath =
                    new URL(
                        post.bloggerUrl
                    ).pathname;


                if (
                    bloggerPath ===
                    targetPath
                ) {

                    return post;
                }

            } catch {

                // continue
            }
        }
    }


    // --------------------------------------------------------
    // Second attempt:
    // Fetch posts around the target year/month.
    //
    // This is useful for very old Blogger posts where q
    // does not return the expected result.
    // --------------------------------------------------------

    const yearMonthUrl =
        new URL(
            BLOG_FEED
        );


    yearMonthUrl.searchParams.set(
        "alt",
        "json"
    );

    yearMonthUrl.searchParams.set(
        "published-min",
        `${year}-${month}-01T00:00:00Z`
    );

    yearMonthUrl.searchParams.set(
        "published-max",
        `${year}-${month}-31T23:59:59Z`
    );

    yearMonthUrl.searchParams.set(
        "max-results",
        "100"
    );


    const secondResponse =
        await fetch(
            yearMonthUrl.toString(),
            {
                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (
        secondResponse.ok
    ) {

        const secondData =
            await secondResponse.json();


        const entries =
            Array.isArray(
                secondData.feed?.entry
            )
                ? secondData.feed.entry
                : [];


        for (
            const entry
            of entries
        ) {

            const post =
                createPost(
                    entry
                );


            if (!post.bloggerUrl) {
                continue;
            }


            try {

                const bloggerPath =
                    new URL(
                        post.bloggerUrl
                    ).pathname;


                if (
                    bloggerPath ===
                    targetPath
                ) {

                    return post;
                }

            } catch {

                // continue
            }
        }
    }


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


    // Blogger image sizes
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


    result =
        result.replace(
            /\/s\d+\//g,
            "/s1600/"
        );


    // --------------------------------------------------------
    // Fix images
    // --------------------------------------------------------

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


                return (
                    `<img${attrs}>`
                );
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
// LABEL LINK
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

    const labels =
        post.labels &&
        post.labels.length
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


    // --------------------------------------------------------
    // IMPORTANT:
    //
    // Do NOT display post.image separately here if the
    // Blogger content already starts with the same image.
    //
    // This fixes your previous "same image twice" problem.
    // --------------------------------------------------------

    let content =
        cleanPostContent(
            post.content
        );


    const featuredImage =
        post.image
            ? escapeHtml(
                post.image
            )
            : "";


    // Remove the first content image when it is the
    // same image as the featured image.
    if (
        featuredImage &&
        content
    ) {

        const firstImage =
            content.match(
                /<img\b[^>]*src=["']([^"']+)["'][^>]*>/i
            );


        if (
            firstImage
        ) {

            const firstImageUrl =
                upgradeImageUrl(
                    firstImage[1],
                    "s1600"
                );


            const featuredUrl =
                upgradeImageUrl(
                    post.image,
                    "s1600"
                );


            if (
                firstImageUrl ===
                featuredUrl
            ) {

                content =
                    content.replace(
                        firstImage[0],
                        ""
                    );
            }
        }
    }


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

<meta
    property="og:title"
    content="${escapeHtml(post.title)}"
>

<meta
    property="og:type"
    content="article"
>

${
    featuredImage
        ? `

<meta
    property="og:image"
    content="${featuredImage}"
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
    font-size: 30px;
    line-height: 1.3;
    margin: 0 0 12px;
}

.post-date {
    color: #777;
    font-size: 14px;
    margin-bottom: 28px;
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
        max-height: none;
        width: 100%;
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
    src="${featuredImage}"
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

© ${new Date().getFullYear()}
Filmstars

</footer>

</body>

</html>`;
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
    // IMPORTANT:
    //
    // Do NOT intercept normal static pages.
    // ========================================================

    if (
        pathname === "/" ||
        pathname === "/index.html" ||
        pathname === "/blog" ||
        pathname === "/blog/" ||
        pathname === "/blog.html" ||
        pathname === "/about" ||
        pathname === "/about/" ||
        pathname === "/about.html" ||
        pathname === "/contact" ||
        pathname === "/contact/" ||
        pathname === "/contact.html" ||
        pathname === "/privacy-policy" ||
        pathname === "/privacy-policy/" ||
        pathname === "/privacy-policy.html" ||
        pathname === "/disclaimer" ||
        pathname === "/disclaimer/" ||
        pathname === "/disclaimer.html"
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
The requested post could not be found in Blogger.
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
