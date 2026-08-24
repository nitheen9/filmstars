const FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const BLOGGER =
    "https://tollywoodboost.blogspot.com";


function text(value) {

    return value && value.$t
        ? value.$t
        : "";
}


function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function largeImage(url) {

    if (!url) return "";

    return url
        .replace(/\/s72-c\//g, "/s1600/")
        .replace(/\/s72\//g, "/s1600/")
        .replace(
            /\/w72-h72-p-k-no-nu\//g,
            "/s1600/"
        );
}


function getOriginalUrl(entry) {

    if (!Array.isArray(entry.link)) {
        return "";
    }

    const link =
        entry.link.find(
            x => x.rel === "alternate"
        );

    return link
        ? link.href
        : "";
}


function filmstarsUrl(url) {

    try {

        const u =
            new URL(url);

        const m =
            u.pathname.match(
                /^\/(\d{4})\/(\d{2})\/(.+)\.html$/
            );

        if (!m) {
            return url;
        }

        return `/${m[1]}/${m[2]}/${m[3]}.html`;

    } catch {

        return url;

    }
}


function slugFromUrl(url) {

    try {

        const u =
            new URL(url);

        const m =
            u.pathname.match(
                /^\/\d{4}\/\d{2}\/(.+)\.html$/
            );

        return m
            ? m[1]
            : "";

    } catch {

        return "";

    }
}


function labels(entry) {

    if (!Array.isArray(entry.category)) {
        return [];
    }

    return entry.category
        .map(
            x => x.term
        )
        .filter(Boolean);
}


function getImage(entry, content) {

    if (
        entry.media$thumbnail &&
        entry.media$thumbnail.url
    ) {

        return largeImage(
            entry.media$thumbnail.url
        );

    }


    const match =
        content.match(
            /<img[^>]+src=["']([^"']+)["']/i
        );

    return match
        ? largeImage(match[1])
        : "";
}


function cleanContent(html) {

    if (!html) {
        return "";
    }

    let result = html;


    /*
     * Remove scripts.
     */

    result =
        result.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );


    /*
     * Remove styles.
     */

    result =
        result.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );


    /*
     * Remove forms.
     */

    result =
        result.replace(
            /<form[\s\S]*?<\/form>/gi,
            ""
        );


    /*
     * Remove dangerous iframe/embed/object.
     */

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


    /*
     * Remove event attributes.
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
     * Upgrade Blogger image URLs.
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
            /\/w72-h72-p-k-no-nu\//g,
            "/s1600/"
        );


    /*
     * Fix lazy-loaded Blogger images.
     */

    result =
        result.replace(
            /data-src=["']([^"']+)["']/gi,
            (match, url) => {

                return `src="${largeImage(url)}"`;
            }
        );


    /*
     * Remove Blogger's width/height
     * restrictions from images.
     */

    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            (match, attrs) => {

                let a =
                    attrs
                        .replace(
                            /\swidth=["'][^"']*["']/gi,
                            ""
                        )
                        .replace(
                            /\sheight=["'][^"']*["']/gi,
                            ""
                        );

                return `<img${a}>`;
            }
        );


    /*
     * Remove unnecessary Blogger
     * sharing widgets.
     */

    result =
        result.replace(
            /<div[^>]+class=["'][^"']*(?:share-buttons|post-share-buttons)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
            ""
        );


    return result;
}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const d =
        new Date(value);

    if (isNaN(d.getTime())) {
        return "";
    }

    return d.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function postObject(entry) {

    const original =
        getOriginalUrl(entry);

    const content =
        text(entry.content) ||
        text(entry.summary);

    return {

        title:
            text(entry.title),

        url:
            filmstarsUrl(
                original
            ),

        bloggerUrl:
            original,

        published:
            text(entry.published),

        updated:
            text(entry.updated),

        image:
            getImage(
                entry,
                content
            ),

        content,

        labels:
            labels(entry)

    };
}


function postCard(post) {

    const title =
        escapeHtml(
            post.title
        );

    const url =
        escapeHtml(
            post.url
        );

    const image =
        escapeHtml(
            post.image
        );

    const date =
        escapeHtml(
            formatDate(
                post.published
            )
        );


    return `

        <article class="related-card">

            ${
                image
                    ? `
                    <a href="${url}">
                        <img
                            src="${image}"
                            alt="${title}"
                            loading="lazy"
                        >
                    </a>
                    `
                    : ""
            }

            <div class="related-content">

                <h3>

                    <a href="${url}">
                        ${title}
                    </a>

                </h3>

                ${
                    date
                        ? `
                        <div class="related-date">
                            ${date}
                        </div>
                        `
                        : ""
                }

                <a
                    class="related-read"
                    href="${url}"
                >
                    Read More
                </a>

            </div>

        </article>

    `;
}


function labelHtml(label) {

    return `
        <a
            class="label"
            href="/blog?label=${encodeURIComponent(label)}"
        >
            ${escapeHtml(label)}
        </a>
    `;
}


function pageHtml(post, previous, next, related) {

    const title =
        escapeHtml(
            post.title
        );

    const description =
        escapeHtml(
            post.title
        );

    const image =
        escapeHtml(
            post.image
        );

    const date =
        escapeHtml(
            formatDate(
                post.published
            )
        );


    const labelsHtml =
        post.labels.length
            ? `
                <div class="labels">

                    <strong>
                        Labels:
                    </strong>

                    ${post.labels
                        .map(labelHtml)
                        .join("")}

                </div>
            `
            : "";


    const previousHtml =
        previous
            ? `
                <a
                    class="prev-next prev"
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
                <span class="prev-next disabled">
                    <span>← Previous Post</span>
                </span>
            `;


    const nextHtml =
        next
            ? `
                <a
                    class="prev-next next"
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
                <span class="prev-next disabled">
                    <span>Next Post →</span>
                </span>
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
    ${title} | Filmstars
</title>

<meta
    name="description"
    content="${description}"
>

${
    image
        ? `
<meta
    property="og:image"
    content="${image}"
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
        #f5f7fb;

    color:
        #222;
}


.header {

    background:
        #111827;

    color:
        white;

    padding:
        18px 20px;
}


.header-inner {

    max-width:
        1200px;

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
        26px;

    font-weight:
        bold;
}


.header a {

    color:
        white;

    text-decoration:
        none;

    margin-left:
        18px;
}


.main {

    width:
        92%;

    max-width:
        1000px;

    margin:
        35px auto 70px;
}


.back {

    display:
        inline-block;

    margin-bottom:
        18px;

    color:
        #2563eb;

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
        0 4px 18px
        rgba(0,0,0,.06);
}


.post h1 {

    font-size:
        40px;

    line-height:
        1.25;

    margin:
        0 0 12px;
}


.date {

    color:
        #777;

    font-size:
        14px;

    margin-bottom:
        25px;
}


.featured {

    width:
        100%;

    height:
        auto;

    max-height:
        750px;

    object-fit:
        contain;

    display:
        block;

    margin:
        0 auto 30px;

    border-radius:
        8px;
}


.post-body {

    font-size:
        18px;

    line-height:
        1.8;

    color:
        #292929;
}


.post-body p {

    margin:
        0 0 22px;
}


.post-body h2,
.post-body h3 {

    line-height:
        1.4;

    margin-top:
        30px;
}


.post-body img {

    width:
        auto;

    max-width:
        100%;

    height:
        auto;

    display:
        block;

    margin:
        28px auto;

    border-radius:
        6px;
}


.post-body figure {

    margin:
        25px 0;

    text-align:
        center;
}


.post-body a {

    color:
        #2563eb;
}


.post-body table {

    max-width:
        100%;

    overflow:
        auto;

    display:
        block;
}


.labels {

    margin-top:
        30px;

    padding-top:
        20px;

    border-top:
        1px solid #eee;

    line-height:
        2.5;
}


.label {

    display:
        inline-block;

    background:
        #eef2ff;

    color:
        #3730a3;

    padding:
        3px 10px;

    border-radius:
        20px;

    margin:
        4px;

    text-decoration:
        none;

    font-size:
        13px;
}


.navigation {

    display:
        grid;

    grid-template-columns:
        1fr 1fr;

    gap:
        20px;

    margin-top:
        30px;
}


.prev-next {

    background:
        white;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    padding:
        18px;

    text-decoration:
        none;

    color:
        #222;

    display:
        flex;

    flex-direction:
        column;

    gap:
        8px;
}


.prev-next:hover {

    border-color:
        #2563eb;

}


.prev-next span {

    color:
        #2563eb;

    font-size:
        13px;

    font-weight:
        bold;
}


.prev-next strong {

    line-height:
        1.4;
}


.prev {

    text-align:
        left;
}


.next {

    text-align:
        right;
}


.disabled {

    opacity:
        .45;

    cursor:
        default;
}


.related-section {

    margin-top:
        55px;
}


.related-section h2 {

    font-size:
        28px;

    margin-bottom:
        25px;
}


.related-grid {

    display:
        grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap:
        22px;
}


.related-card {

    background:
        white;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    overflow:
        hidden;

    box-shadow:
        0 3px 12px
        rgba(0,0,0,.05);
}


.related-card img {

    width:
        100%;

    height:
        190px;

    object-fit:
        cover;

    display:
        block;
}


.related-content {

    padding:
        16px;
}


.related-content h3 {

    margin:
        0 0 8px;

    font-size:
        18px;

    line-height:
        1.4;
}


.related-content h3 a {

    color:
        #222;

    text-decoration:
        none;
}


.related-content h3 a:hover {

    color:
        #2563eb;
}


.related-date {

    color:
        #777;

    font-size:
        12px;

    margin-bottom:
        12px;
}


.related-read {

    display:
        inline-block;

    padding:
        8px 12px;

    background:
        #2563eb;

    color:
        white;

    border-radius:
        6px;

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
        #ccc;

    text-align:
        center;

    padding:
        25px;
}


@media (max-width: 800px) {

    .related-grid {

        grid-template-columns:
            repeat(2, 1fr);

    }

}


@media (max-width: 600px) {

    .header-inner {

        flex-direction:
            column;

        gap:
            15px;

    }

    .header a {

        margin:
            0 7px;

    }

    .post {

        padding:
            20px;

    }

    .post h1 {

        font-size:
            29px;

    }

    .post-body {

        font-size:
            16px;

        line-height:
            1.7;

    }

    .navigation {

        grid-template-columns:
            1fr;

    }

    .next {

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
        Filmstars
    </div>

    <nav>

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

<h1>
    ${title}
</h1>


${
    date
        ? `
        <div class="date">
            Published ${date}
        </div>
        `
        : ""
}


${
    image
        ? `
        <img
            class="featured"
            src="${image}"
            alt="${title}"
        >
        `
        : ""
}


<div class="post-body">

    ${cleanContent(post.content)}

</div>


${labelsHtml}


</article>


<div class="navigation">

    ${previousHtml}

    ${nextHtml}

</div>


<section class="related-section">

    <h2>
        Related Posts
    </h2>

    <div class="related-grid">

        ${related
            .map(postCard)
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


async function getFeed(
    startIndex,
    maxResults
) {

    const url =
        `${FEED}?alt=json&start-index=${startIndex}&max-results=${maxResults}`;

    const response =
        await fetch(
            url,
            {
                headers: {
                    "User-Agent":
                        "Filmstars Pages"
                }
            }
        );

    if (!response.ok) {
        throw new Error(
            "Blogger feed unavailable"
        );
    }

    const data =
        await response.json();

    return Array.isArray(
        data.feed?.entry
    )
        ? data.feed.entry
        : [];
}


export async function onRequest(context) {

    const path =
        context.request.url
            ? new URL(
                context.request.url
            ).pathname
            : "";


    /*
     * Only handle:
     *
     * /YYYY/MM/slug.html
     */

    const match =
        path.match(
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

        /*
         * Get a large enough window to find
         * the requested post and surrounding posts.
         *
         * This also gives us the related posts.
         */

        const entries =
            await getFeed(
                1,
                150
            );


        const posts =
            entries.map(
                postObject
            );


        const currentIndex =
            posts.findIndex(
                post =>
                    slugFromUrl(
                        post.bloggerUrl
                    ) === slug
            );


        if (currentIndex === -1) {

            return new Response(
                "Post Not Found",
                {
                    status: 404
                }
            );

        }


        const current =
            posts[currentIndex];


        /*
         * Previous and next follow Blogger's
         * current feed order.
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
         * Related posts.
         *
         * First prefer posts sharing
         * at least one label.
         */

        const currentLabels =
            new Set(
                current.labels
            );


        const scored =
            posts
                .filter(
                    (_, index) =>
                        index !== currentIndex
                )
                .map(post => {

                    const shared =
                        post.labels.filter(
                            label =>
                                currentLabels
                                    .has(label)
                        ).length;

                    return {
                        post,
                        score: shared
                    };

                })
                .sort(
                    (a, b) =>
                        b.score - a.score
                );


        const related =
            scored
                .slice(
                    0,
                    12
                )
                .map(
                    x => x.post
                );


        /*
         * If fewer than 12 were available,
         * fill from the remaining posts.
         */

        if (related.length < 12) {

            for (
                const post of posts
            ) {

                if (
                    post.url ===
                    current.url
                ) {
                    continue;
                }

                if (
                    related.some(
                        x =>
                            x.url ===
                            post.url
                    )
                ) {
                    continue;
                }

                related.push(post);

                if (
                    related.length >= 12
                ) {
                    break;
                }

            }

        }


        const html =
            pageHtml(
                current,
                previous,
                next,
                related.slice(
                    0,
                    12
                )
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

        console.error(error);

        return new Response(
            "Unable to load post",
            {
                status: 500
            }
        );

    }

}
