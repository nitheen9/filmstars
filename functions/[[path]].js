const BLOGGER_HOST =
    "tollywoodboost.blogspot.com";

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function makeLargeImages(html) {

    if (!html) {
        return "";
    }

    return html
        .replace(/\/s72-c\//g, "/s600/")
        .replace(/\/s72\//g, "/s600/")
        .replace(
            /\/w72-h72-p-k-no-nu\//g,
            "/w900/"
        );
}

function cleanPostHtml(html) {

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
     * Remove iframe/object/embed.
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
     * Remove event-handler attributes.
     *
     * Example:
     * onclick=""
     * onload=""
     * onerror=""
     */
    result =
        result.replace(
            /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        );

    /*
     * Remove javascript: links.
     */
    result =
        result.replace(
            /javascript\s*:/gi,
            ""
        );

    /*
     * Upgrade Blogger image sizes.
     */
    result =
        makeLargeImages(result);

    /*
     * Make links open normally in the Filmstars page.
     */
    result =
        result.replace(
            /<a\b([^>]*)>/gi,
            (match, attributes) => {

                if (
                    /target\s*=/i.test(
                        attributes
                    )
                ) {
                    return match;
                }

                return `<a${attributes} target="_blank" rel="noopener">`;
            }
        );

    return result;
}

function extractTitle(html) {

    let match =
        html.match(
            /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
        );

    if (match) {
        return match[1];
    }

    match =
        html.match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

    if (match) {
        return match[1]
            .replace(/\s+/g, " ")
            .trim();
    }

    return "Tollywood Boost";
}

function extractDescription(html) {

    const match =
        html.match(
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
        );

    return match
        ? match[1]
        : "";
}

function extractImage(html) {

    const match =
        html.match(
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        );

    if (match) {
        return makeLargeImages(
            match[1]
        );
    }

    return "";
}

function extractPostBody(html) {

    /*
     * Blogger templates commonly use
     * .post-body.
     */

    let match =
        html.match(
            /<div[^>]+class=["'][^"']*\bpost-body\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
        );

    if (match) {
        return cleanPostHtml(
            match[1]
        );
    }

    /*
     * Alternative Blogger structure.
     */

    match =
        html.match(
            /<div[^>]+class=["'][^"']*\bpost-body\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );

    if (match) {
        return cleanPostHtml(
            match[1]
        );
    }

    /*
     * Another common Blogger class.
     */

    match =
        html.match(
            /<div[^>]+class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );

    if (match) {
        return cleanPostHtml(
            match[1]
        );
    }

    return "";
}

function getDate(html) {

    let match =
        html.match(
            /<time[^>]+datetime=["']([^"']+)["']/i
        );

    if (match) {
        return match[1];
    }

    match =
        html.match(
            /<abbr[^>]+title=["']([^"']+)["']/i
        );

    if (match) {
        return match[1];
    }

    return "";
}

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (isNaN(date.getTime())) {
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

function buildPage({
    title,
    description,
    image,
    postHtml,
    date,
    originalUrl
}) {

    const safeTitle =
        escapeHtml(title);

    const safeDescription =
        escapeHtml(description);

    const safeImage =
        escapeHtml(image);

    const safeDate =
        escapeHtml(
            formatDate(date)
        );

    return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>${safeTitle} | Filmstars</title>

<meta name="description"
      content="${safeDescription}">

<meta property="og:title"
      content="${safeTitle}">

${
    safeImage
        ? `
<meta property="og:image"
      content="${safeImage}">
`
        : ""
}

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    font-family:
        Arial,
        Helvetica,
        sans-serif;
    background: #f5f7fb;
    color: #222;
}

.site-header {
    background: #111827;
    color: white;
    padding: 18px 20px;
}

.header-inner {
    max-width: 1100px;
    margin: auto;

    display: flex;
    align-items: center;
    justify-content: space-between;
}

.logo {
    font-size: 25px;
    font-weight: bold;
}

.site-header a {
    color: white;
    text-decoration: none;
    margin-left: 18px;
}

.post-wrapper {
    width: 92%;
    max-width: 900px;
    margin: 40px auto 60px;
}

.post-card {
    background: white;
    padding: 30px;

    border-radius: 12px;

    border: 1px solid #e5e7eb;

    box-shadow:
        0 4px 18px
        rgba(0,0,0,.06);
}

.post-title {
    font-size: 38px;
    line-height: 1.25;
    margin: 0 0 12px;
}

.post-date {
    color: #777;
    font-size: 14px;
    margin-bottom: 25px;
}

.post-featured-image {
    width: 100%;
    height: auto;
    max-height: 650px;
    object-fit: contain;

    display: block;

    margin: 0 auto 30px;

    border-radius: 8px;
}

.post-body {
    font-size: 17px;
    line-height: 1.8;
}

.post-body img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 25px auto;
}

.post-body iframe {
    max-width: 100%;
}

.post-body table {
    max-width: 100%;
}

.post-body a {
    color: #2563eb;
}

.back-link {
    display: inline-block;
    margin-bottom: 20px;

    color: #2563eb;
    text-decoration: none;

    font-weight: bold;
}

.original-link {
    margin-top: 35px;
    padding-top: 20px;

    border-top: 1px solid #eee;

    font-size: 14px;
}

.original-link a {
    color: #2563eb;
}

.site-footer {
    background: #111827;
    color: #ccc;

    text-align: center;

    padding: 25px;
}

.site-footer a {
    color: white;
}

@media (max-width: 600px) {

    .post-wrapper {
        width: 94%;
        margin-top: 20px;
    }

    .post-card {
        padding: 20px;
    }

    .post-title {
        font-size: 28px;
    }

    .post-body {
        font-size: 16px;
    }

}

</style>

</head>

<body>

<header class="site-header">

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


<main class="post-wrapper">

    <a
        class="back-link"
        href="/blog"
    >
        ← Back to Latest Posts
    </a>


    <article class="post-card">

        <h1 class="post-title">
            ${safeTitle}
        </h1>


        ${
            safeDate
                ? `
                <div class="post-date">
                    Published ${safeDate}
                </div>
                `
                : ""
        }


        ${
            safeImage
                ? `
                <img
                    class="post-featured-image"
                    src="${safeImage}"
                    alt="${safeTitle}"
                >
                `
                : ""
        }


        <div class="post-body">

            ${postHtml}

        </div>


        <div class="original-link">

            Source:
            <a
                href="${escapeHtml(originalUrl)}"
                target="_blank"
                rel="noopener"
            >
                Tollywood Boost
            </a>

        </div>

    </article>

</main>


<footer class="site-footer">

    © ${new Date().getFullYear()} Filmstars

</footer>

</body>

</html>`;
}


export async function onRequest(context) {

    try {

        const requestUrl =
            new URL(
                context.request.url
            );

        const pathname =
            requestUrl.pathname;


        /*
         * Don't intercept the API.
         */
        if (
            pathname === "/blogger-posts" ||
            pathname.startsWith(
                "/blogger-posts/"
            )
        ) {

            return context.next();

        }


        /*
         * Don't intercept normal
         * static files/pages.
         */
        if (
            pathname === "/" ||
            pathname === "/blog" ||
            pathname === "/blog/"
        ) {

            return context.next();

        }


        /*
         * Only accept Blogger-style
         * post URLs:
         *
         * /2026/06/post-name.html
         */

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


        /*
         * Construct the original
         * Blogger URL.
         */

        const bloggerUrl =
            `https://${BLOGGER_HOST}/${year}/${month}/${slug}.html`;


        const response =
            await fetch(
                bloggerUrl,
                {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 Filmstars Pages"
                    }
                }
            );


        if (!response.ok) {

            return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Post Not Found | Filmstars</title>
                    <meta charset="UTF-8">
                    <meta name="viewport"
                          content="width=device-width, initial-scale=1.0">
                </head>
                <body style="
                    font-family:Arial;
                    text-align:center;
                    padding:60px 20px;
                ">
                    <h1>Post Not Found</h1>
                    <p>
                        The requested post could not be found.
                    </p>
                    <p>
                        <a href="/blog">
                            ← Back to Blog
                        </a>
                    </p>
                </body>
                </html>
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


        const html =
            await response.text();


        const title =
            extractTitle(html);

        const description =
            extractDescription(html);

        const image =
            extractImage(html);

        const postHtml =
            extractPostBody(html);

        const date =
            getDate(html);


        if (!postHtml) {

            return new Response(
                `
                <!DOCTYPE html>

                <html>

                <head>
                    <title>
                        ${escapeHtml(title)}
                        | Filmstars
                    </title>

                    <meta charset="UTF-8">

                    <meta name="viewport"
                          content="width=device-width, initial-scale=1.0">
                </head>

                <body style="
                    font-family:Arial;
                    max-width:900px;
                    margin:60px auto;
                    padding:20px;
                ">

                    <h1>
                        ${escapeHtml(title)}
                    </h1>

                    <p>
                        The post content could not
                        be extracted from Blogger.
                    </p>

                    <p>
                        <a
                            href="${escapeHtml(bloggerUrl)}"
                            target="_blank"
                            rel="noopener"
                        >
                            Open original post
                        </a>
                    </p>

                </body>

                </html>
                `,
                {
                    status: 200,
                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8"
                    }
                }
            );

        }


        const page =
            buildPage({
                title,
                description,
                image,
                postHtml,
                date,
                originalUrl:
                    bloggerUrl
            });


        return new Response(
            page,
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
            "Internal Server Error",
            {
                status: 500
            }
        );

    }
}
