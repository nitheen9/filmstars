const BLOGS = {
    abc: "https://tollywoodboost.blogspot.com",
    xyz: "https://tollyboost.blogspot.com"
};

const MAX_RESULTS = 500;

export async function onRequestGet(context) {

    const requestUrl = new URL(
        context.request.url
    );

    const blog = requestUrl.searchParams.get(
        "blog"
    );

    const start = Number(
        requestUrl.searchParams.get(
            "start"
        ) || "1"
    );


    if (!BLOGS[blog]) {

        return json(
            {
                success: false,
                error:
                    "Invalid blog. Use abc or xyz."
            },
            400
        );
    }


    if (
        !Number.isInteger(start) ||
        start < 1
    ) {

        return json(
            {
                success: false,
                error:
                    "Invalid start value."
            },
            400
        );
    }


    const feedUrl =
        BLOGS[blog] +
        "/feeds/posts/default" +
        "?alt=json" +
        "&start-index=" +
        start +
        "&max-results=" +
        MAX_RESULTS;


    try {

        const response =
            await fetch(
                feedUrl,
                {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 Filmstars Blogger Duplicate Finder"
                    }
                }
            );


        if (!response.ok) {

            return json(
                {
                    success: false,
                    error:
                        "Blogger returned HTTP " +
                        response.status
                },
                502
            );
        }


        const data =
            await response.json();


        const entries =
            data?.feed?.entry || [];


        const posts =
            entries.map(
                parsePost
            );


        return json({
            success: true,
            blog: blog,
            start: start,
            count: posts.length,
            hasMore:
                posts.length === MAX_RESULTS,
            posts: posts
        });

    }
    catch (error) {

        return json(
            {
                success: false,
                error:
                    error?.message ||
                    "Unable to read Blogger."
            },
            500
        );
    }
}


/* =========================================
   PARSE BLOGGER POST
========================================= */

function parsePost(entry) {

    const links =
        Array.isArray(entry.link)
            ? entry.link
            : [];


    const alternate =
        links.find(
            link =>
                link.rel === "alternate"
        );


    const title =
        entry.title?.$t || "";


    const content =
        entry.content?.$t ||
        entry.summary?.$t ||
        "";


    const published =
        entry.published?.$t || "";


    const updated =
        entry.updated?.$t || "";


    const id =
        entry.id?.$t || "";


    return {

        id: id,

        title: title,

        published: published,

        updated: updated,

        url:
            alternate?.href || "",

        content: content,

        images:
            extractImages(
                content
            )
    };
}


/* =========================================
   EXTRACT BLOGGER IMAGES
========================================= */

function extractImages(html) {

    if (!html) {
        return [];
    }


    const images = [];


    /*
     * src
     */

    const srcRegex =
        /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;


    let match;


    while (
        (match =
            srcRegex.exec(html)) !== null
    ) {

        const image =
            normalizeImage(
                match[1]
            );


        if (
            image &&
            !images.includes(image)
        ) {

            images.push(image);
        }
    }


    /*
     * data-src
     */

    const dataRegex =
        /<img[^>]+data-src\s*=\s*["']([^"']+)["']/gi;


    while (
        (match =
            dataRegex.exec(html)) !== null
    ) {

        const image =
            normalizeImage(
                match[1]
            );


        if (
            image &&
            !images.includes(image)
        ) {

            images.push(image);
        }
    }


    return images;
}


/* =========================================
   NORMALIZE BLOGGER IMAGE URL
========================================= */

function normalizeImage(url) {

    if (!url) {
        return "";
    }


    let result = url;


    /*
     * Examples:
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
     * Remove Google image
     * transformation suffix.
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


/* =========================================
   JSON RESPONSE
========================================= */

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
        {
            status: status,

            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
