const BLOGGER_FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const POSTS_PER_PAGE = 20;

function getText(value) {
    return value && value.$t ? value.$t : "";
}

function getAlternateUrl(entry) {
    if (!Array.isArray(entry.link)) {
        return "";
    }

    const link = entry.link.find(
        item => item.rel === "alternate"
    );

    return link && link.href ? link.href : "";
}

function makeLargeImage(url) {
    if (!url) {
        return "";
    }

    return url
        .replace(/\/s72-c\//, "/s600/")
        .replace(/\/s72\//, "/s600/")
        .replace(/\/w72-h72-p-k-no-nu\//, "/w900/")
        .replace(/\/s1600\//, "/s1600/");
}

function getFilmstarsUrl(bloggerUrl) {
    try {
        const url = new URL(bloggerUrl);

        const match = url.pathname.match(
            /^\/(\d{4})\/(\d{2})\/([^/]+)\.html$/
        );

        if (!match) {
            return bloggerUrl;
        }

        return `/${match[1]}/${match[2]}/${match[3]}.html`;
    } catch {
        return bloggerUrl;
    }
}

function getFirstImage(html) {
    if (!html) {
        return "";
    }

    const match = html.match(
        /<img[^>]+src=["']([^"']+)["']/i
    );

    if (!match) {
        return "";
    }

    return makeLargeImage(match[1]);
}

function htmlToText(html) {
    return (html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function createExcerpt(html) {
    const text = htmlToText(html);

    if (text.length <= 220) {
        return text;
    }

    return text.substring(0, 220).trim() + "...";
}

export async function onRequestGet(context) {

    try {

        const requestUrl =
            new URL(context.request.url);

        let page =
            parseInt(
                requestUrl.searchParams.get("page") || "1",
                10
            );

        if (!Number.isFinite(page) || page < 1) {
            page = 1;
        }

        const startIndex =
            ((page - 1) * POSTS_PER_PAGE) + 1;

        const feedUrl =
            `${BLOGGER_FEED}?alt=json&start-index=${startIndex}&max-results=${POSTS_PER_PAGE}`;

        const response =
            await fetch(feedUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 Filmstars Pages"
                }
            });

        if (!response.ok) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Unable to fetch Blogger feed."
                },
                {
                    status: 502
                }
            );
        }

        const data =
            await response.json();

        const feed =
            data.feed || {};

        const entries =
            Array.isArray(feed.entry)
                ? feed.entry
                : [];

        const totalResults =
            feed["openSearch$totalResults"] &&
            feed["openSearch$totalResults"].$t
                ? parseInt(
                    feed["openSearch$totalResults"].$t,
                    10
                )
                : 0;

        const totalPages =
            totalResults > 0
                ? Math.ceil(
                    totalResults / POSTS_PER_PAGE
                )
                : 1;

        const posts =
            entries.map(entry => {

                const bloggerUrl =
                    getAlternateUrl(entry);

                const content =
                    getText(entry.content) ||
                    getText(entry.summary);

                let image = "";

                if (
                    entry.media$thumbnail &&
                    entry.media$thumbnail.url
                ) {
                    image =
                        makeLargeImage(
                            entry.media$thumbnail.url
                        );
                }

                if (!image) {
                    image =
                        getFirstImage(content);
                }

                return {

                    title:
                        getText(entry.title) ||
                        "Untitled Post",

                    url:
                        getFilmstarsUrl(
                            bloggerUrl
                        ),

                    bloggerUrl,

                    published:
                        getText(entry.published),

                    updated:
                        getText(entry.updated),

                    image,

                    excerpt:
                        createExcerpt(content)

                };

            });


        return Response.json(
            {
                success: true,

                blog:
                    "Tollywood Boost",

                source:
                    "https://tollywoodboost.blogspot.com/",

                page,

                perPage:
                    POSTS_PER_PAGE,

                totalPosts:
                    totalResults,

                totalPages,

                posts
            },
            {
                headers: {
                    "Cache-Control":
                        "public, max-age=300, s-maxage=300"
                }
            }
        );

    } catch (error) {

        console.error(error);

        return Response.json(
            {
                success: false,
                error:
                    "Server error while loading Blogger posts."
            },
            {
                status: 500,
                headers: {
                    "Cache-Control":
                        "no-store"
                }
            }
        );

    }
}
