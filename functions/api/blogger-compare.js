const ABC_BLOG =
    "https://tollywoodboost.blogspot.com";

const XYZ_BLOG =
    "https://tollyboost.blogspot.com";

const PAGE_SIZE = 50;

export async function onRequestGet(context) {

    const request =
        context.request;

    const url =
        new URL(request.url);

    const query =
        (url.searchParams.get("q") || "")
        .trim();

    if (!query) {

        return json({
            error: "Missing q parameter."
        }, 400);
    }

    try {

        /*
         * Search XYZ first.
         */
        const xyzPosts =
            await searchBlogger(
                XYZ_BLOG,
                query
            );

        /*
         * Search ABC using the same
         * query.
         */
        const abcPosts =
            await searchBlogger(
                ABC_BLOG,
                query
            );

        const matches = [];

        for (const xyz of xyzPosts) {

            const match =
                findBestMatch(
                    xyz,
                    abcPosts
                );

            if (match) {

                matches.push({
                    xyz: xyz,
                    abc: match.post,
                    method: match.method,
                    confidence: match.confidence
                });

            }
        }

        return json({
            query,
            xyzCount: xyzPosts.length,
            abcCount: abcPosts.length,
            matchCount: matches.length,
            matches
        });

    } catch (error) {

        return json({
            error: error.message || "Unknown error."
        }, 500);
    }
}


/*
============================================================
BLOGGER SEARCH
============================================================
*/

async function searchBlogger(
    blog,
    query
) {

    /*
     * Blogger Atom feeds support q for
     * searching feed content.
     */
    const feedUrl =
        blog.replace(/\/$/, "") +
        "/feeds/posts/default" +
        "?alt=json" +
        "&max-results=" +
        PAGE_SIZE +
        "&q=" +
        encodeURIComponent(query);

    const response =
        await fetch(
            feedUrl,
            {
                headers: {
                    "User-Agent":
                        "Filmstars Blogger Compare"
                }
            }
        );

    if (!response.ok) {

        throw new Error(
            `Blogger feed failed: ${response.status}`
        );
    }

    const data =
        await response.json();

    const entries =
        data.feed?.entry || [];

    return entries.map(
        parseBloggerPost
    );
}


/*
============================================================
PARSE POST
============================================================
*/

function parseBloggerPost(entry) {

    const links =
        entry.link || [];

    const alternate =
        links.find(
            x => x.rel === "alternate"
        );

    const url =
        alternate?.href || "";

    const content =
        entry.content?.$t ||
        entry.summary?.$t ||
        "";

    const title =
        entry.title?.$t ||
        "";

    const published =
        entry.published?.$t ||
        "";

    const updated =
        entry.updated?.$t ||
        "";

    const id =
        entry.id?.$t ||
        "";

    return {
        id,
        title,
        normalizedTitle:
            normalizeTitle(title),

        published,
        updated,

        url,

        content,

        normalizedContent:
            normalizeContent(content),

        contentHash:
            hash(
                normalizeContent(content)
            ),

        images:
            extractImages(content)
    };
}


/*
============================================================
NORMALIZE TITLE
============================================================
*/

function normalizeTitle(value) {

    return String(value || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(
            /[^\p{L}\p{N}\s]/gu,
            " "
        )
        .replace(/\s+/g, " ")
        .trim();
}


/*
============================================================
NORMALIZE CONTENT
============================================================
*/

function normalizeContent(html) {

    let value =
        String(html || "");

    /*
     * Remove scripts.
     */
    value =
        value.replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        );

    /*
     * Remove styles.
     */
    value =
        value.replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        );

    /*
     * Normalize Blogger image
     * transformation parameters.
     */
    value =
        value.replace(
            /=w\d+-h\d+[^"' ]*/gi,
            ""
        );

    /*
     * Normalize common Blogger
     * image sizes.
     */
    value =
        value.replace(
            /\/s\d+(-rw)?\//gi,
            "/s1600-rw/"
        );

    /*
     * Normalize whitespace.
     */
    value =
        value
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return value;
}


/*
============================================================
IMAGE EXTRACTION
============================================================
*/

function extractImages(html) {

    const images = [];

    const regex =
        /<img[^>]+src=["']([^"']+)["']/gi;

    let match;

    while (
        (match = regex.exec(html)) !== null
    ) {

        let image =
            match[1];

        /*
         * Remove Blogger transformation
         * suffix.
         */
        image =
            image.replace(
                /=w\d+-h\d+.*$/i,
                ""
            );

        images.push(image);
    }

    return [
        ...new Set(images)
    ];
}


/*
============================================================
FIND BEST MATCH
============================================================
*/

function findBestMatch(
    xyz,
    abcPosts
) {

    /*
     * First: exact normalized content.
     */
    for (const abc of abcPosts) {

        if (
            xyz.contentHash ===
            abc.contentHash
        ) {

            return {
                post: abc,
                method: "EXACT CONTENT",
                confidence: "100%"
            };
        }
    }


    /*
     * Second: exact normalized title.
     */
    const sameTitle =
        abcPosts.filter(
            abc =>
                abc.normalizedTitle ===
                xyz.normalizedTitle
        );

    if (sameTitle.length === 1) {

        return {
            post: sameTitle[0],
            method: "TITLE",
            confidence: "95%"
        };
    }


    /*
     * Third: title + publication date.
     */
    const xyzDate =
        getDate(xyz.published);

    const titleDate =
        sameTitle.filter(
            abc =>
                getDate(
                    abc.published
                ) === xyzDate
        );

    if (titleDate.length === 1) {

        return {
            post: titleDate[0],
            method: "TITLE + DATE",
            confidence: "98%"
        };
    }


    /*
     * Fourth: title similarity.
     */
    let best = null;

    let bestScore = 0;

    for (const abc of abcPosts) {

        const score =
            titleSimilarity(
                xyz.normalizedTitle,
                abc.normalizedTitle
            );

        if (score > bestScore) {

            bestScore = score;
            best = abc;
        }
    }

    if (
        best &&
        bestScore >= 0.90
    ) {

        return {
            post: best,
            method: "SIMILAR TITLE",
            confidence:
                Math.round(
                    bestScore * 100
                ) + "%"
        };
    }

    return null;
}


/*
============================================================
DATE
============================================================
*/

function getDate(value) {

    if (!value) return "";

    return value.substring(
        0,
        10
    );
}


/*
============================================================
TITLE SIMILARITY
============================================================
*/

function titleSimilarity(a, b) {

    if (!a || !b) return 0;

    if (a === b) return 1;

    const wordsA =
        new Set(
            a.split(" ")
                .filter(Boolean)
        );

    const wordsB =
        new Set(
            b.split(" ")
                .filter(Boolean)
        );

    let common = 0;

    for (const word of wordsA) {

        if (wordsB.has(word)) {
            common++;
        }
    }

    const total =
        new Set([
            ...wordsA,
            ...wordsB
        ]).size;

    if (!total) return 0;

    return common / total;
}


/*
============================================================
HASH
============================================================
*/

async function sha256(value) {

    const data =
        new TextEncoder()
            .encode(value);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return Array
        .from(
            new Uint8Array(digest)
        )
        .map(
            b =>
                b
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");
}


/*
============================================================
JSON RESPONSE
============================================================
*/

function json(data, status = 200) {

    return new Response(
        JSON.stringify(
            data,
            null,
            2
        ),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Cache-Control":
                    "no-store"
            }
        }
    );
}
