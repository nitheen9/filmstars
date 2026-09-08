// ============================================================
// FILMSTARS - DYNAMIC SITEMAP
// ============================================================
//
// Main sitemap:
// https://filmstars.pages.dev/sitemap.xml
//
// Static pages:
// https://filmstars.pages.dev/sitemap.xml?type=pages
//
// Blog post sitemap:
// https://filmstars.pages.dev/sitemap.xml?type=posts&page=1
//
// 800 Blogger posts per sitemap
// ============================================================

const SITE_URL = "https://filmstars.pages.dev";

const BLOG_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const POSTS_PER_SITEMAP = 800;
const BLOGGER_BATCH_SIZE = 150;

// Current blog is approximately 15,000+ posts.
// This is only used if Blogger's total-count request temporarily fails.
const FALLBACK_POST_SITEMAPS = 20;


// ============================================================
// XML ESCAPE
// ============================================================

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


// ============================================================
// TEXT FROM BLOGGER JSON
// ============================================================

function getText(value) {
    if (
        value &&
        typeof value === "object" &&
        "$t" in value
    ) {
        return String(value.$t || "");
    }

    return "";
}


// ============================================================
// BLOGGER ALTERNATE URL
// ============================================================

function getAlternateUrl(entry) {
    if (!Array.isArray(entry?.link)) {
        return "";
    }

    const link = entry.link.find(
        item =>
            item &&
            item.rel === "alternate" &&
            item.href
    );

    return link ? link.href : "";
}


// ============================================================
// CONVERT BLOGGER URL TO FILMSTARS URL
// ============================================================

function convertToSiteUrl(bloggerUrl) {

    if (!bloggerUrl) {
        return "";
    }

    try {

        const url = new URL(bloggerUrl);

        const match = url.pathname.match(
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
// CREATE POST OBJECT
// ============================================================

function createPost(entry) {

    const bloggerUrl =
        getAlternateUrl(entry);

    const url =
        convertToSiteUrl(bloggerUrl);

    if (!url) {
        return null;
    }

    const updated =
        getText(entry?.updated);

    const published =
        getText(entry?.published);

    return {
        url: url,
        lastmod: updated || published || ""
    };
}


// ============================================================
// FETCH BLOGGER BATCH
// ============================================================

async function fetchBloggerBatch(
    startIndex,
    maxResults
) {

    const url = new URL(BLOG_FEED);

    url.searchParams.set("alt", "json");
    url.searchParams.set(
        "start-index",
        String(startIndex)
    );
    url.searchParams.set(
        "max-results",
        String(maxResults)
    );

    const response = await fetch(
        url.toString(),
        {
            headers: {
                "Accept": "application/json"
            },

            cf: {
                cacheTtl: 1800,
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
// GET BLOGGER TOTAL
// ============================================================
//
// IMPORTANT:
// If Blogger temporarily fails, do NOT make the main sitemap
// fail. Use the fallback number of sitemap pages.
// ============================================================

async function getBloggerTotal() {

    try {

        const data =
            await fetchBloggerBatch(1, 1);

        const total =
            Number(
                data?.feed
                    ?.openSearch$totalResults
                    ?.$t
            );

        if (
            Number.isFinite(total) &&
            total > 0
        ) {
            return total;
        }

    } catch (error) {

        console.error(
            "Unable to get Blogger total:",
            error
        );

    }

    return FALLBACK_POST_SITEMAPS *
        POSTS_PER_SITEMAP;
}


// ============================================================
// STATIC PAGES
// ============================================================

function getStaticPages() {

    return [

        {
            url: SITE_URL + "/"
        },

        {
            url: SITE_URL + "/about/"
        },

        {
            url: SITE_URL + "/contact/"
        },

        {
            url: SITE_URL + "/privacy-policy/"
        },

        {
            url: SITE_URL + "/disclaimer/"
        },

        {
            url: SITE_URL + "/blog"
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
            .map(page => {

                return `
<url>
    <loc>${escapeXml(page.url)}</loc>
</url>`;

            })
            .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xml}
</urlset>`;
}


// ============================================================
// GET POSTS FOR ONE SITEMAP PAGE
// ============================================================

async function getPostsForSitemapPage(page) {

    const startIndex =
        ((page - 1) * POSTS_PER_SITEMAP) + 1;

    const endIndex =
        startIndex +
        POSTS_PER_SITEMAP -
        1;

    const posts = [];

    let currentIndex =
        startIndex;

    while (
        currentIndex <= endIndex
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
            const entry of entries
        ) {

            const post =
                createPost(entry);

            if (post) {
                posts.push(post);
            }

        }

        currentIndex +=
            entries.length;

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
// CREATE POST SITEMAP
// ============================================================

function createPostSitemap(posts) {

    const xml =
        posts
            .map(post => {

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

            })
            .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xml}
</urlset>`;
}


// ============================================================
// CREATE SITEMAP INDEX
// ============================================================

async function createSitemapIndex() {

    const total =
        await getBloggerTotal();

    let totalPages =
        Math.ceil(
            total /
            POSTS_PER_SITEMAP
        );

    // Safety fallback
    if (
        !Number.isFinite(totalPages) ||
        totalPages < 1
    ) {
        totalPages =
            FALLBACK_POST_SITEMAPS;
    }

    const now =
        new Date().toISOString();

    let xml = "";

    // --------------------------------------------------------
    // STATIC PAGES SITEMAP
    // --------------------------------------------------------

    xml += `
<sitemap>
    <loc>${SITE_URL}/sitemap.xml?type=pages</loc>
    <lastmod>${now}</lastmod>
</sitemap>`;

    // --------------------------------------------------------
    // BLOG POST SITEMAPS
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
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xml}
</sitemapindex>`;
}


// ============================================================
// XML RESPONSE
// ============================================================

function xmlResponse(
    xml,
    status = 200,
    cacheSeconds = 1800
) {

    return new Response(
        xml,
        {
            status: status,

            headers: {

                // text/xml is deliberately used here for
                // maximum compatibility with crawlers/tools.
                "Content-Type":
                    "text/xml; charset=UTF-8",

                "Cache-Control":
                    `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,

                "X-Content-Type-Options":
                    "nosniff"

            }
        }
    );
}


// ============================================================
// CLOUDFLARE PAGES HANDLER
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
            )
                .trim()
                .toLowerCase();


        // ====================================================
        // MAIN SITEMAP INDEX
        //
        // /sitemap.xml
        // ====================================================

        if (!type) {

            const xml =
                await createSitemapIndex();

            return xmlResponse(
                xml
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

            return xmlResponse(
                createPagesSitemap()
            );
        }


        // ====================================================
        // BLOG POSTS
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
                Math.ceil(
                    total /
                    POSTS_PER_SITEMAP
                );

            if (
                page > totalPages
            ) {

                return new Response(
                    "Sitemap page not found.",
                    {
                        status: 404,

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

            return xmlResponse(
                xml
            );
        }


        // ====================================================
        // INVALID TYPE
        // ====================================================

        return new Response(
            "Invalid sitemap type.",
            {
                status: 400,

                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8"
                }
            }
        );

    } catch (error) {

        console.error(
            "Filmstars sitemap error:",
            error
        );

        return new Response(
            "Unable to generate sitemap.",
            {
                status: 500,

                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8",

                    "Cache-Control":
                        "no-cache, no-store, must-revalidate"
                }
            }
        );
    }
}
