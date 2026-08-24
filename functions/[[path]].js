const FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";


function text(value) {

    return value && value.$t
        ? value.$t
        : "";

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

        return (
            "/" +
            m[1] +
            "/" +
            m[2] +
            "/" +
            m[3] +
            ".html"
        );

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


function largeImage(url) {

    if (!url) {
        return "";
    }

    /*
     * Blogger image URL conversion.
     *
     * s72-c = thumbnail
     * s800  = listing
     * s1600 = single post
     */

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
            /\/w72-h72-p-k-no-nu\//g,
            "/s1600/"
        )

        .replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
        );

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
        (content || "").match(
            /<img[^>]+src=["']([^"']+)["']/i
        );


    return match
        ? largeImage(match[1])
        : "";

}


function getLabels(entry) {

    if (!Array.isArray(entry.category)) {
        return [];
    }

    return entry.category

        .map(
            x => x.term
        )

        .filter(Boolean);

}


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


function cleanContent(html) {

    if (!html) {
        return "";
    }


    let result =
        html;


    /*
     * Remove scripts/styles.
     */

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


    /*
     * Remove iframes.
     */

    result =
        result.replace(
            /<iframe[\s\S]*?<\/iframe>/gi,
            ""
        );


    /*
     * Remove object/embed.
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
     * Remove inline JavaScript events.
     */

    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );


    /*
     * Remove javascript: URLs.
     */

    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );


    /*
     * Convert all Blogger small images
     * to high-resolution images.
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


    result =
        result.replace(
            /\/w\d+-h\d+-p-k-no-nu\//g,
            "/s1600/"
        );


    /*
     * Fix lazy-loaded images.
     */

    result =
        result.replace(
            /data-src=["']([^"']+)["']/gi,
            (match, url) => {

                return `
                    src="${largeImage(url)}"
                `;

            }
        );


    /*
     * Remove hard-coded Blogger
     * width/height from images.
     */

    result =
        result.replace(
            /<img\b([^>]*)>/gi,
            (match, attrs) => {

                const cleaned =
                    attrs

                        .replace(
                            /\swidth=["'][^"']*["']/gi,
                            ""
                        )

                        .replace(
                            /\sheight=["'][^"']*["']/gi,
                            ""
                        )

                        .replace(
                            /\sstyle=["'][^"']*["']/gi,
                            ""
                        );


                return `
                    <img${cleaned}>
                `;

            }
        );


    return result;

}


function makePost(entry) {

    const bloggerUrl =
        getOriginalUrl(entry);

    const content =
        text(entry.content) ||
        text(entry.summary);


    return {

        title:
            text(entry.title),

        bloggerUrl,

        url:
            filmstarsUrl(
                bloggerUrl
            ),

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
            getLabels(entry)

    };

}


async function getPosts() {

    /*
     * Get latest 150 posts.
     *
     * This is enough for previous/next
     * and related posts for the current blog.
     */

    const response =
        await fetch(
            FEED +
            "?alt=json&start-index=1&max-results=150",
            {
                headers: {
                    "User-Agent":
                        "Filmstars Pages"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to fetch Blogger feed"
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


    return entries.map(
        makePost
    );

}


function relatedCard(post) {

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

        <a
            class="related-image-link"
            href="${url}"
        >

            ${
                image
                    ? `
                    <img
                        src="${image}"
                        alt="${title}"
                        loading="lazy"
                        decoding="async"
                    >
                    `
                    : ""
            }

        </a>


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


function createPage(
    post,
    previous,
    next,
    related
) {

    const title =
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


    const labels =
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
                    class="prev-next"
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

                <div class="prev-next disabled">

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

                <div class="prev-next disabled">

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
    ${title} | Filmstars
</title>


<meta
    name="description"
    content="${title}"
>


${
    image

        ? `

        <meta
            property="og:image"
            content="${image}"
        >

        <meta
            name="twitter:card"
            content="summary_large_image"
        >

        <meta
            name="twitter:image"
            content="${image}"
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
        #111827;

    color:
        white;
}


.header-inner {

    width:
        92%;

    max-width:
        1200px;

    margin:
        auto;

    min-height:
        68px;

    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;
}


.logo {

    font-size:
        27px;

    font-weight:
        bold;
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
        1000px;

    margin:
        35px auto 70px;
}


.back {

    display:
        inline-block;

    margin-bottom:
        20px;

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


/*
 * IMPORTANT:
 * Main image is NOT cropped.
 */

.featured {

    display:
        block;

    width:
        100%;

    height:
        auto;

    max-width:
        100%;

    max-height:
        1000px;

    object-fit:
        contain;

    margin:
        0 auto 35px;

    border-radius:
        8px;

    background:
        #f5f5f5;
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


.post-body h2 {

    font-size:
        27px;

    line-height:
        1.4;

    margin:
        35px 0 15px;
}


.post-body h3 {

    font-size:
        23px;

    margin:
        30px 0 14px;
}


.post-body img {

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
}


.post-body figure {

    margin:
        30px 0;

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

    overflow-x:
        auto;

    display:
        block;
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


.label {

    display:
        inline-block;

    background:
        #eef2ff;

    color:
        #3730a3;

    padding:
        3px 11px;

    margin:
        4px;

    border-radius:
        20px;

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

    display:
        flex;

    flex-direction:
        column;

    gap:
        8px;

    padding:
        18px;

    border:
        1px solid #e5e7eb;

    border-radius:
        10px;

    background:
        white;

    color:
        #222;

    text-decoration:
        none;
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
        1.45;
}


.next {

    text-align:
        right;
}


.disabled {

    opacity:
        .45;
}


.related-section {

    margin-top:
        55px;
}


.related-section h2 {

    font-size:
        29px;

    margin:
        0 0 25px;
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


.related-image-link {

    display:
        block;

    background:
        #f1f1f1;
}


.related-card img {

    width:
        100%;

    height:
        260px;

    display:
        block;

    object-fit:
        contain;

    background:
        #f1f1f1;
}


.related-content {

    padding:
        15px;
}


.related-content h3 {

    margin:
        0 0 8px;

    font-size:
        17px;

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

    background:
        #2563eb;

    color:
        white;

    padding:
        7px 11px;

    border-radius:
        5px;

    font-size:
        12px;

    font-weight:
        bold;

    text-decoration:
        none;
}


.footer {

    background:
        #111827;

    color:
        #aaa;

    text-align:
        center;

    padding:
        28px 15px;
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

        flex-direction:
            column;

        gap:
            14px;
    }

    .nav a {

        margin:
            0 8px;
    }

    .post {

        padding:
            18px;
    }

    .post h1 {

        font-size:
            29px;
    }

    .post-body {

        font-size:
            16px;

        line-height:
            1.75;
    }

    .featured {

        max-height:
            none;

        margin-bottom:
            25px;
    }

    .post-body img {

        max-height:
            none;
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

    .related-card img {

        height:
            auto;

        max-height:
            700px;

        object-fit:
            contain;
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


${labels}


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
            .map(relatedCard)
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


export async function onRequest(context) {

    const requestUrl =
        new URL(
            context.request.url
        );


    const path =
        requestUrl.pathname;


    /*
     * Only process Blogger-style
     * post URLs.
     */

    const match =
        path.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );


    if (!match) {

        return context.next();

    }


    const slug =
        match[3];


    try {

        const posts =
            await getPosts();


        /*
         * Find requested post.
         */

        const currentIndex =
            posts.findIndex(
                post =>
                    slugFromUrl(
                        post.bloggerUrl
                    ) === slug
            );


        if (
            currentIndex === -1
        ) {

            return new Response(
                `
                <h1>Post Not Found</h1>
                <p>
                    The requested post could not be found.
                </p>
                `,
                {
                    status: 404,

                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8"
                    }
                }
            );

        }


        const current =
            posts[currentIndex];


        /*
         * Feed order:
         *
         * newest -> oldest
         *
         * Therefore:
         *
         * previous = older
         * next = newer
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
         * Give preference to posts
         * sharing labels.
         */

        const currentLabels =
            new Set(
                current.labels
            );


        const candidates =
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
                    (a, b) =>
                        b.score -
                        a.score
                );


        const related =
            candidates

                .slice(
                    0,
                    12
                )

                .map(
                    item =>
                        item.post
                );


        const html =
            createPage(
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


    } catch (error) {

        console.error(error);


        return new Response(
            "Unable to load Blogger post.",
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
