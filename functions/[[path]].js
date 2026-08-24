// ============================================================
// functions/[[path]].js
// FILMSTARS - SINGLE BLOGGER POST HANDLER
// Works with Blogger posts from 2011 through 2026+
// ============================================================

const BLOG_URL =
    "https://tollywoodboost.blogspot.com/";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";


// ============================================================
// BASIC TEXT
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

    if (!Array.isArray(entry?.link)) {
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
// CONVERT BLOGGER URL TO FILMSTARS URL
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
// SLUG
// ============================================================

function getSlug(url) {

    if (!url) {
        return "";
    }

    try {

        let pathname;

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
// IMAGE URL UPGRADE
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
// GET IMAGE FROM POST
// ============================================================

function getPostImage(
    entry,
    content,
    size = "s1600"
) {

    // Blogger thumbnail
    if (
        entry?.media$thumbnail?.url
    ) {

        return upgradeImageUrl(
            entry.media$thumbnail.url,
            size
        );

    }


    if (content) {

        // data-src
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


        // normal img src
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

    if (!Array.isArray(entry?.category)) {
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
// CREATE POST OBJECT
// ============================================================

function createPost(
    entry
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
                "s1600"
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
    params = {}
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
        "max-results",
        String(
            params.maxResults || 150
        )
    );

    if (
        params.startIndex
    ) {

        url.searchParams.set(
            "start-index",
            String(
                params.startIndex
            )
        );

    }

    if (
        params.publishedMin
    ) {

        url.searchParams.set(
            "published-min",
            params.publishedMin
        );

    }

    if (
        params.publishedMax
    ) {

        url.searchParams.set(
            "published-max",
            params.publishedMax
        );

    }


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
            `Blogger HTTP ${response.status}`
        );

    }


    return await response.json();

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
// GET TOTAL
// ============================================================

function getTotal(data) {

    return Number(
        data?.feed
            ?.openSearch$totalResults
            ?.$t
    ) || 0;

}


// ============================================================
// FETCH ALL POSTS FROM A MONTH
//
// Example:
//
// 2017/03
//
// becomes:
//
// published-min=2017-03-01T00:00:00+00:00
//
// published-max=2017-04-01T00:00:00+00:00
//
// This allows old posts to work.
// ============================================================

async function fetchMonthPosts(
    year,
    month
) {

    const monthNumber =
        Number(month);

    const yearNumber =
        Number(year);


    if (
        !Number.isInteger(yearNumber) ||
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
    ) {

        return [];

    }


    const startDate =
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


    const endDate =
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


    const publishedMin =
        startDate.toISOString();


    const publishedMax =
        endDate.toISOString();


    // --------------------------------------------------------
    // First request
    // --------------------------------------------------------

    const firstData =
        await fetchBlogger({
            publishedMin:
                publishedMin,

            publishedMax:
                publishedMax,

            startIndex:
                1,

            maxResults:
                150
        });


    let entries =
        getEntries(
            firstData
        );


    const total =
        getTotal(
            firstData
        );


    // --------------------------------------------------------
    // If Blogger reports more than 150 posts for one month,
    // fetch the remaining pages too.
    // --------------------------------------------------------

    if (
        total > entries.length
    ) {

        let startIndex =
            entries.length + 1;


        while (
            startIndex <= total &&
            startIndex <= 1000
        ) {

            const data =
                await fetchBlogger({
                    publishedMin:
                        publishedMin,

                    publishedMax:
                        publishedMax,

                    startIndex:
                        startIndex,

                    maxResults:
                        150
                });


            const moreEntries =
                getEntries(
                    data
                );


            if (
                moreEntries.length === 0
            ) {
                break;
            }


            entries =
                entries.concat(
                    moreEntries
                );


            startIndex +=
                moreEntries.length;


            if (
                moreEntries.length < 150
            ) {
                break;
            }

        }

    }


    return entries;

}


// ============================================================
// FIND POST IN MONTH
// ============================================================

async function findPostByArchive(
    year,
    month,
    slug
) {

    const entries =
        await fetchMonthPosts(
            year,
            month
        );


    const posts =
        entries
            .map(
                entry =>
                    createPost(entry)
            )
            .filter(
                post =>
                    post.url
            );


    // --------------------------------------------------------
    // Exact Filmstars URL
    // --------------------------------------------------------

    const requestedPath =
        `/${year}/${month}/${slug}.html`;


    let index =
        posts.findIndex(
            post =>
                post.url ===
                requestedPath
        );


    if (
        index !== -1
    ) {

        return {

            posts:
                posts,

            index:
                index

        };

    }


    // --------------------------------------------------------
    // Exact slug
    // --------------------------------------------------------

    index =
        posts.findIndex(
            post =>
                getSlug(
                    post.url
                ) ===
                slug
        );


    if (
        index !== -1
    ) {

        return {

            posts:
                posts,

            index:
                index

        };

    }


    // --------------------------------------------------------
    // Blogger URL slug fallback
    // --------------------------------------------------------

    index =
        posts.findIndex(
            post =>
                getSlug(
                    post.bloggerUrl
                ) ===
                slug
        );


    if (
        index !== -1
    ) {

        return {

            posts:
                posts,

            index:
                index

        };

    }


    return {

        posts:
            posts,

        index:
            -1

    };

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
// FORMAT DATE
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
//
// IMPORTANT:
// This removes the first content image when it is the same
// image already being displayed as the featured image.
// ============================================================

function cleanPostContent(
    html,
    featuredImage
) {

    if (!html) {
        return "";
    }


    let result =
        String(html);


    // --------------------------------------------------------
    // Remove scripts
    // --------------------------------------------------------

    result =
        result.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove styles
    // --------------------------------------------------------

    result =
        result.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove iframe
    // --------------------------------------------------------

    result =
        result.replace(
            /<iframe[\s\S]*?<\/iframe>/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove object
    // --------------------------------------------------------

    result =
        result.replace(
            /<object[\s\S]*?<\/object>/gi,
            ""
        );


    // --------------------------------------------------------
    // Remove embed
    // --------------------------------------------------------

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
    // Remove javascript URLs
    // --------------------------------------------------------

    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    // --------------------------------------------------------
    // Upgrade Blogger images
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Upgrade all s-number image URLs
    // --------------------------------------------------------

    result =
        result.replace(
            /\/s\d+\//g,
            "/s1600/"
        );


    // --------------------------------------------------------
    // Remove first image if it is same as featured image
    // --------------------------------------------------------

    if (
        featuredImage
    ) {

        const normalizedFeatured =
            normalizeImageUrl(
                featuredImage
            );


        let firstImageRemoved =
            false;


        result =
            result.replace(
                /<img\b[^>]*>/i,
                function(
                    imageTag
                ) {

                    if (
                        firstImageRemoved
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


                    const imageUrl =
                        upgradeImageUrl(
                            match[1],
                            "s1600"
                        );


                    const normalizedImage =
                        normalizeImageUrl(
                            imageUrl
                        );


                    if (
                        normalizedImage ===
                        normalizedFeatured
                    ) {

                        firstImageRemoved =
                            true;

                        return "";

                    }


                    return imageTag;

                }
            );

    }


    // --------------------------------------------------------
    // Convert lazy data-src to src
    // --------------------------------------------------------

    result =
        result.replace(
            /<img\b([^>]*?)>/gi,
            function(
                full,
                attributes
            ) {

                let attrs =
                    attributes;


                const dataSrc =
                    attrs.match(
                        /\bdata-src\s*=\s*["']([^"']+)["']/i
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


                // Remove fixed dimensions
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


                // Remove inline styles
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
    // Upgrade final image src
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


    return result;

}


// ============================================================
// NORMALIZE IMAGE URL
//
// Removes Blogger size parameters so two versions of the
// same image compare as equal.
// ============================================================

function normalizeImageUrl(
    url
) {

    if (!url) {
        return "";
    }


    try {

        let value =
            String(url)
                .trim();


        value =
            value.replace(
                /^https?:\/\//i,
                ""
            );


        value =
            value.replace(
                /\/s\d+(-c)?\//gi,
                "/"
            );


        value =
            value.replace(
                /\/w\d+-h\d+(?:-[^/]+)?\//gi,
                "/"
            );


        value =
            value.replace(
                /\/s1600\//gi,
                "/"
            );


        return value
            .toLowerCase()
            .split("?")[0];

    } catch {

        return String(url)
            .toLowerCase();

    }

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

function createSinglePostPage(
    post,
    previous,
    next,
    related
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
${escapeHtml(next.title)}
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


    const content =
        cleanPostContent(
            post.content,
            post.image
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
    content="${escapeHtml(post.title)} - Filmstars"
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

    font-size: 30px;

    line-height: 1.3;

    margin:
        0 0 12px;

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

    margin: 4px;

    padding:
        3px 12px;

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

        font-size: 28px;

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

<a href="/">
Film Stars
</a>

</div>

<nav class="nav">

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

© ${new Date().getFullYear()} Filmstars

</footer>

</body>

</html>`;

}


// ============================================================
// POST NOT FOUND PAGE
// ============================================================

function notFoundPage(
    requestedPath
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

    font-family:
        Arial,
        sans-serif;

    background:
        #f5f6f8;

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

    color:
        #2563eb;

    text-decoration: none;

    font-weight: bold;

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
The requested Filmstars post could not be found.
</p>

<p class="path">
${escapeHtml(requestedPath)}
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
            "no-cache, no-store"

    }

}

);

}


// ============================================================
// SINGLE POST HANDLER
// ============================================================

async function singlePostPage(
    requestUrl
) {

    const pathname =
        requestUrl.pathname;


    // --------------------------------------------------------
    // Match:
    //
    // /2026/06/post.html
    // /2017/03/post.html
    // /2011/01/post.html
    // --------------------------------------------------------

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
        "Filmstars single post:",
        year,
        month,
        slug
    );


    // --------------------------------------------------------
    // Find directly in the requested Blogger month
    // --------------------------------------------------------

    const result =
        await findPostByArchive(
            year,
            month,
            slug
        );


    const posts =
        result.posts;


    const currentIndex =
        result.index;


    // --------------------------------------------------------
    // NOT FOUND
    // --------------------------------------------------------

    if (
        currentIndex === -1
    ) {

        return notFoundPage(
            pathname
        );

    }


    const current =
        posts[currentIndex];


    // --------------------------------------------------------
    // Sort posts newest -> oldest
    // --------------------------------------------------------

    posts.sort(
        (a, b) => {

            return (
                new Date(
                    b.published
                ) -
                new Date(
                    a.published
                )
            );

        }
    );


    // --------------------------------------------------------
    // Find current post again after sorting
    // --------------------------------------------------------

    const sortedIndex =
        posts.findIndex(
            post =>
                post.url ===
                current.url
        );


    // --------------------------------------------------------
    // Previous / Next
    //
    // Blogger order:
    //
    // newest
    // ↓
    // oldest
    //
    // Previous = older
    // Next = newer
    // --------------------------------------------------------

    const previous =
        sortedIndex <
        posts.length - 1

            ? posts[
                sortedIndex + 1
            ]

            : null;


    const next =
        sortedIndex > 0

            ? posts[
                sortedIndex - 1
            ]

            : null;


    // --------------------------------------------------------
    // RELATED POSTS
    // --------------------------------------------------------

    const currentLabels =
        new Set(
            current.labels || []
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

                    let score =
                        0;


                    for (
                        const label
                        of (
                            post.labels ||
                            []
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


    // --------------------------------------------------------
    // CREATE HTML
    // --------------------------------------------------------

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
// MAIN CLOUDFLARE HANDLER
// ============================================================

export async function onRequest(
    context
) {

    const requestUrl =
        new URL(
            context.request.url
        );


    // ========================================================
    // SINGLE BLOGGER POST
    // ========================================================

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

<style>

body {

    font-family:
        Arial,
        sans-serif;

    background:
        #f5f6f8;

    padding:
        50px 20px;

    text-align:
        center;

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
        #2563eb;

}

</style>

</head>

<body>

<div class="box">

<h1>
Unable to Load Post
</h1>

<p>
The Blogger post could not be loaded right now.
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
        500,

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


    // ========================================================
    // EVERYTHING ELSE
    //
    // Let Cloudflare Pages serve:
    //
    // index.html
    // blog.html
    // other HTML files
    // ========================================================

    return context.next();

}
