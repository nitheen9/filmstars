// ============================================================
// FILMSTARS - DYNAMIC SITEMAP
// ============================================================
//
// Main sitemap index:
//
// https://filmstars.pages.dev/sitemap.xml
//
// Post sitemap page:
//
// https://filmstars.pages.dev/sitemap.xml?type=posts&page=1
// https://filmstars.pages.dev/sitemap.xml?type=posts&page=2
// https://filmstars.pages.dev/sitemap.xml?type=posts&page=3
//
// Each post sitemap contains 800 Blogger post URLs.
//
// ============================================================

const SITE_URL =
    "https://filmstars.pages.dev";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const POSTS_PER_SITEMAP =
    800;

const BLOGGER_BATCH_SIZE =
    150;


// ============================================================
// XML ESCAPE
// ============================================================

function escapeXml(value) {

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
            "&apos;"
        );
}


// ============================================================
// GET TEXT
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
// BLOGGER ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {

    if (
        !Array.isArray(
            entry?.link
        )
    ) {

        return "";

    }


    const link =
        entry.link.find(
            item =>
                item &&
                item.rel === "alternate" &&
                item.href
        );


    return link
        ? link.href
        : "";

}


// ============================================================
// CONVERT BLOGGER URL
// ============================================================

function convertToSiteUrl(
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
            SITE_URL +
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
// CREATE POST URL DATA
// ============================================================

function createPost(
    entry
) {

    const bloggerUrl =
        getAlternateUrl(
            entry
        );


    const url =
        convertToSiteUrl(
            bloggerUrl
        );


    if (!url) {

        return null;

    }


    const updated =
        getText(
            entry?.updated
        );


    const published =
        getText(
            entry?.published
        );


    return {

        url:
            url,

        lastmod:
            updated ||
            published ||
            ""

    };

}


// ============================================================
// FETCH BLOGGER BATCH
// ============================================================

async function fetchBloggerBatch(
    startIndex,
    maxResults
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
        String(
            startIndex
        )
    );


    url.searchParams.set(
        "max-results",
        String(
            maxResults
        )
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
                    cacheTtl:
                        1800,

                    cacheEverything:
                        true
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
// GET BLOGGER TOTAL
// ============================================================

async function getBloggerTotal() {

    const data =
        await fetchBloggerBatch(
            1,
            1
        );


    return Number(
        data?.feed
            ?.openSearch$totalResults
            ?.$t
    ) || 0;

}


// ============================================================
// NORMAL STATIC PAGES
// ============================================================

function getStaticPages() {

    return [

        {
            url:
                SITE_URL + "/"
        },

        {
            url:
                SITE_URL + "/about/"
        },

        {
            url:
                SITE_URL + "/contact/"
        },

        {
            url:
                SITE_URL + "/privacy-policy/"
        },

        {
            url:
                SITE_URL + "/disclaimer/"
        },

        {
            url:
                SITE_URL + "/blog"
        }

    ];

}


// ============================================================
// CREATE STATIC PAGE SITEMAP
// ============================================================

function createPagesSitemap() {

    const pages =
        getStaticPages();


    const xml =
        pages
            .map(
                page => {

                    return `
<url>
    <loc>${escapeXml(page.url)}</loc>
</url>`;

                }
            )
            .join("");


    return `<?xml version="1.0" encoding="UTF-8"?>

<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${xml}
</urlset>`;

}


// ============================================================
// FETCH EXACT 800 POSTS FOR ONE SITEMAP PAGE
// ============================================================
//
// Example:
//
// page 1:
// 1 -> 800
//
// page 2:
// 801 -> 1600
//
// page 3:
// 1601 -> 2400
//
// Blogger allows smaller batches, so this function performs
// multiple Blogger requests and combines them.
//
// ============================================================

async function getPostsForSitemapPage(
    page
) {

    const startIndex =
        (
            (page - 1) *
            POSTS_PER_SITEMAP
        ) + 1;


    const endIndex =
        startIndex +
        POSTS_PER_SITEMAP -
        1;


    const posts = [];


    let currentIndex =
        startIndex;


    while (
        currentIndex <=
        endIndex
    ) {

        const remaining =
            endIndex -
            currentIndex +
            1;


        const batchSize =
            Math.min(
                BLOGGER_BATCH_SIZE,
                remaining
            );


        const data =
            await fetchBloggerBatch(
                currentIndex,
                batchSize
            );


        const entries =
            Array.isArray(
                data?.feed?.entry
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
                    entry
                );


            if (
                post
            ) {

                posts.push(
                    post
                );

            }

        }


        currentIndex +=
            entries.length;


        // Blogger returned fewer posts than requested.
        // There are no more posts.

        if (
            entries.length <
            batchSize
        ) {

            break;

        }

    }


    return posts;

}


// ============================================================
// CREATE POST URLSET
// ============================================================

function createPostSitemap(
    posts
) {

    const xml =
        posts
            .map(
                post => {

                    const lastmod =
                        post.lastmod
                            ? `
    <lastmod>${escapeXml(
        post.lastmod
    )}</lastmod>`
                            : "";


                    return `
<url>
    <loc>${escapeXml(
        post.url
    )}</loc>${lastmod}
</url>`;

                }
            )
            .join("");


    return `<?xml version="1.0" encoding="UTF-8"?>

<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${xml}
</urlset>`;

}


// ============================================================
// CREATE SITEMAP INDEX
// ============================================================

async function createSitemapIndex() {

    const total =
        await getBloggerTotal();


    const totalPages =
        total > 0
            ? Math.ceil(
                total /
                POSTS_PER_SITEMAP
            )
            : 0;


    const now =
        new Date()
            .toISOString();


    let xml = "";


    // --------------------------------------------------------
    // Static pages sitemap
    // --------------------------------------------------------

    xml += `

<sitemap>

    <loc>${SITE_URL}/sitemap.xml?type=pages</loc>

    <lastmod>${now}</lastmod>

</sitemap>`;


    // --------------------------------------------------------
    // Blog post sitemap pages
    // --------------------------------------------------------

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        xml += `

<sitemap>

    <loc>${SITE_URL}/sitemap.xml?type=posts&amp;page=${page}</loc>

</sitemap>`;

    }


    return `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${xml}
</sitemapindex>`;

}


// ============================================================
// CLOUDFLARE HANDLER
// ============================================================

export async function onRequestGet(
    context
) {

    try {

        const requestUrl =
            new URL(
                context.request.url
            );


        const type =
            (
                requestUrl.searchParams.get(
                    "type"
                ) || ""
            ).trim()
                .toLowerCase();


        // ====================================================
        // MAIN INDEX
        //
        // /sitemap.xml
        // ====================================================

        if (
            !type
        ) {

            const xml =
                await createSitemapIndex();


            return new Response(
                xml,
                {
                    status:
                        200,

                    headers: {

                        "Content-Type":
                            "application/xml; charset=UTF-8",

                        "Cache-Control":
                            "public, max-age=1800, s-maxage=1800"

                    }
                }
            );

        }


        // ====================================================
        // STATIC PAGES
        //
        // /sitemap.xml?type=pages
        // ====================================================

        if (
            type === "pages"
        ) {

            return new Response(

                createPagesSitemap(),

                {

                    status:
                        200,

                    headers: {

                        "Content-Type":
                            "application/xml; charset=UTF-8",

                        "Cache-Control":
                            "public, max-age=1800, s-maxage=1800"

                    }

                }

            );

        }


        // ====================================================
        // POSTS
        //
        // /sitemap.xml?type=posts&page=1
        // ====================================================

        if (
            type === "posts"
        ) {

            let page =
                parseInt(
                    requestUrl.searchParams.get(
                        "page"
                    ) || "1",
                    10
                );


            if (
                !Number.isFinite(page) ||
                page < 1
            ) {

                page = 1;

            }


            const total =
                await getBloggerTotal();


            const totalPages =
                total > 0
                    ? Math.ceil(
                        total /
                        POSTS_PER_SITEMAP
                    )
                    : 0;


            if (
                page >
                totalPages &&
                totalPages > 0
            ) {

                return new Response(
                    "Sitemap page not found.",
                    {
                        status:
                            404,

                        headers: {
                            "Content-Type":
                                "text/plain; charset=UTF-8"
                        }
                    }
                );

            }


            const posts =
                await getPostsForSitemapPage(
                    page
                );


            const xml =
                createPostSitemap(
                    posts
                );


            return new Response(
                xml,
                {
                    status:
                        200,

                    headers: {

                        "Content-Type":
                            "application/xml; charset=UTF-8",

                        "Cache-Control":
                            "public, max-age=1800, s-maxage=1800"

                    }
                }
            );

        }


        return new Response(
            "Invalid sitemap type.",
            {
                status:
                    400,

                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8"
                }
            }
        );

    } catch (error) {

        console.error(
            "Sitemap error:",
            error
        );


        return new Response(

            "Unable to generate sitemap.",

            {

                status:
                    500,

                headers: {

                    "Content-Type":
                        "text/plain; charset=UTF-8",

                    "Cache-Control":
                        "no-cache"

                }

            }

        );

    }

}
