const BLOGS = {
    abc: "https://tollywoodboost.blogspot.com",
    xyz: "https://tollyboost.blogspot.com"
};

const BATCH_SIZE = 500;

export async function onRequestGet(context) {
    try {
        const requestUrl = new URL(context.request.url);

        const blog = requestUrl.searchParams.get("blog");
        const start = Number(
            requestUrl.searchParams.get("start") || "1"
        );

        if (!BLOGS[blog]) {
            return json({
                error: "Invalid blog. Use abc or xyz."
            }, 400);
        }

        if (!Number.isInteger(start) || start < 1) {
            return json({
                error: "Invalid start value."
            }, 400);
        }

        const feedUrl =
            BLOGS[blog] +
            "/feeds/posts/default" +
            "?alt=json" +
            "&start-index=" +
            start +
            "&max-results=" +
            BATCH_SIZE;

        const response = await fetch(feedUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 Filmstars Blogger Checker"
            }
        });

        if (!response.ok) {
            return json({
                error:
                    "Blogger returned HTTP " +
                    response.status
            }, 502);
        }

        const data = await response.json();

        const entries =
            data &&
            data.feed &&
            data.feed.entry
                ? data.feed.entry
                : [];

        const posts = entries.map(parsePost);

        return json({
            success: true,
            blog: blog,
            start: start,
            count: posts.length,
            posts: posts
        });

    } catch (error) {

        return json({
            error:
                error && error.message
                    ? error.message
                    : "Unknown server error"
        }, 500);
    }
}


function parsePost(entry) {

    const links =
        Array.isArray(entry.link)
            ? entry.link
            : [];

    const alternate =
        links.find(
            link => link.rel === "alternate"
        );

    const title =
        entry.title &&
        entry.title.$t
            ? entry.title.$t
            : "";

    const content =
        entry.content &&
        entry.content.$t
            ? entry.content.$t
            : (
                entry.summary &&
                entry.summary.$t
                    ? entry.summary.$t
                    : ""
            );

    const published =
        entry.published &&
        entry.published.$t
            ? entry.published.$t
            : "";

    const updated =
        entry.updated &&
        entry.updated.$t
            ? entry.updated.$t
            : "";

    const id =
        entry.id &&
        entry.id.$t
            ? entry.id.$t
            : "";

    return {
        id: id,
        title: title,
        published: published,
        updated: updated,
        url: alternate ? alternate.href : "",
        content: content,
        images: extractImages(content)
    };
}


function extractImages(html) {

    if (!html) {
        return [];
    }

    const result = [];

    /*
     * Find src="..."
     */
    const srcRegex =
        /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;

    let match;

    while (
        (match = srcRegex.exec(html)) !== null
    ) {

        let imageUrl = match[1];

        imageUrl =
            normalizeBloggerImage(imageUrl);

        if (
            imageUrl &&
            !result.includes(imageUrl)
        ) {
            result.push(imageUrl);
        }
    }

    /*
     * Also check data-src.
     */
    const dataSrcRegex =
        /<img[^>]+data-src\s*=\s*["']([^"']+)["']/gi;

    while (
        (match = dataSrcRegex.exec(html)) !== null
    ) {

        let imageUrl = match[1];

        imageUrl =
            normalizeBloggerImage(imageUrl);

        if (
            imageUrl &&
            !result.includes(imageUrl)
        ) {
            result.push(imageUrl);
        }
    }

    return result;
}


function normalizeBloggerImage(url) {

    if (!url) {
        return "";
    }

    let result = url;

    /*
     * Remove Blogger size suffixes such as:
     *
     * /s400/
     * /s800/
     * /s1600/
     * /s1600-rw/
     */
    result =
        result.replace(
            /\/s\d+(?:-rw)?\//i,
            "/s1600/"
        );

    /*
     * Remove Google's image parameters such as:
     *
     * =w0-h0-p-k-no-nu
     */
    result =
        result.replace(
            /=w\d+.*$/i,
            ""
        );

    return result;
}


function json(data, status) {

    return new Response(
        JSON.stringify(data),
        {
            status: status || 200,

            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store"
            }
        }
    );
}
