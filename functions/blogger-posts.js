const FEED =
    "https://tollywoodboost.blogspot.com/feeds/posts/default";

const PER_PAGE = 20;

function text(value) {
    return value && value.$t ? value.$t : "";
}

function bloggerUrl(entry) {
    if (!Array.isArray(entry.link)) {
        return "";
    }

    const link = entry.link.find(
        x => x.rel === "alternate"
    );

    return link ? link.href : "";
}

function filmstarsUrl(url) {
    try {
        const u = new URL(url);

        const m = u.pathname.match(
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

function largeImage(url) {
    if (!url) return "";

    return url
        .replace(/\/s72-c\//g, "/s800/")
        .replace(/\/s72\//g, "/s800/")
        .replace(
            /\/w72-h72-p-k-no-nu\//g,
            "/w800/"
        );
}

function firstImage(html) {

    if (!html) return "";

    const m =
        html.match(
            /<img[^>]+src=["']([^"']+)["']/i
        );

    return m
        ? largeImage(m[1])
        : "";
}

function plainText(html) {

    return (html || "")
        .replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        )
        .replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        )
        .replace(
            /<[^>]+>/g,
            " "
        )
        .replace(
            /&nbsp;/gi,
            " "
        )
        .replace(
            /&amp;/gi,
            "&"
        )
        .replace(
            /&quot;/gi,
            '"'
        )
        .replace(
            /&#39;/gi,
            "'"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function excerpt(html) {

    const t =
        plainText(html);

    return t.length > 220
        ? t.substring(0, 220).trim() + "..."
        : t;
}

function labels(entry) {

    if (!Array.isArray(entry.category)) {
        return [];
    }

    return entry.category
        .map(x => x.term)
        .filter(Boolean);
}

export async function onRequestGet(context) {

    try {

        const url =
            new URL(
                context.request.url
            );

        let page =
            parseInt(
                url.searchParams.get("page") || "1",
                10
            );

        if (!Number.isFinite(page) || page < 1) {
            page = 1;
        }

        const start =
            ((page - 1) * PER_PAGE) + 1;

        const feedUrl =
            `${FEED}?alt=json&start-index=${start}&max-results=${PER_PAGE}`;

        const response =
            await fetch(feedUrl, {
                headers: {
                    "User-Agent":
                        "Filmstars Pages"
                }
            });

        if (!response.ok) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Blogger feed unavailable"
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

        const total =
            feed["openSearch$totalResults"] &&
            feed["openSearch$totalResults"].$t
                ? Number(
                    feed["openSearch$totalResults"].$t
                )
                : entries.length;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total / PER_PAGE
                )
            );

        const posts =
            entries.map(entry => {

                const original =
                    bloggerUrl(entry);

                const content =
                    text(entry.content) ||
                    text(entry.summary);

                let image = "";

                if (
                    entry.media$thumbnail &&
                    entry.media$thumbnail.url
                ) {
                    image =
                        largeImage(
                            entry.media$thumbnail.url
                        );
                }

                if (!image) {
                    image =
                        firstImage(content);
                }

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

                    image,

                    excerpt:
                        excerpt(content),

                    labels:
                        labels(entry)
                };
            });


        return Response.json(
            {
                success: true,

                page,

                perPage:
                    PER_PAGE,

                totalPosts:
                    total,

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
                    "Unable to load Blogger posts"
            },
            {
                status: 500
            }
        );
    }
}
