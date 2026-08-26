const BLOGS = {
    abc: "https://tollywoodboost.blogspot.com",
    xyz: "https://tollyboost.blogspot.com"
};

const MAX_RESULTS = 500;

export async function onRequestGet(context) {

    const url =
        new URL(
            context.request.url
        );

    const blogName =
        url.searchParams.get("blog");

    const start =
        parseInt(
            url.searchParams.get("start") || "1",
            10
        );


    if(
        !BLOGS[blogName]
    ) {

        return json(
            {
                error:
                    "Invalid blog."
            },
            400
        );
    }


    if(
        !Number.isFinite(start) ||
        start < 1
    ) {

        return json(
            {
                error:
                    "Invalid start value."
            },
            400
        );
    }


    const feedUrl =
        BLOGS[blogName] +
        "/feeds/posts/default" +
        "?alt=json" +
        "&max-results=" +
        MAX_RESULTS +
        "&start-index=" +
        start;


    try {

        const response =
            await fetch(
                feedUrl,
                {
                    headers: {
                        "User-Agent":
                            "Filmstars Blogger Duplicate Checker"
                    }
                }
            );


        if(
            !response.ok
        ) {

            return json(
                {
                    error:
                        `Blogger returned HTTP ${response.status}`
                },
                502
            );

        }


        const data =
            await response.json();


        const entries =
            data.feed?.entry ||
            [];


        const posts =
            entries.map(
                parsePost
            );


        return json(
            {
                blog: blogName,
                start,
                count: posts.length,
                posts
            }
        );

    }
    catch(error) {

        return json(
            {
                error:
                    error.message ||
                    "Unable to read Blogger."
            },
            500
        );

    }
}


/* =========================================================
   PARSE BLOGGER POST
========================================================= */

function parsePost(entry) {

    const links =
        entry.link || [];


    const alternate =
        links.find(
            link =>
                link.rel === "alternate"
        );


    const title =
        entry.title?.$t ||
        "";


    const content =
        entry.content?.$t ||
        entry.summary?.$t ||
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

        published,

        updated,

        url:
            alternate?.href ||
            "",

        content,

        images:
            extractImages(
                content
            )

    };
}


/* =========================================================
   EXTRACT IMAGES
========================================================= */

function extractImages(
    html
) {

    const images = [];

    const regex =
        /<img[^>]+src=["']([^"']+)["']/gi;


    let match;


    while(
        (match =
            regex.exec(
                html
            )) !== null
    ) {

        let src =
            match[1];


        /*
         * Remove Blogger image
         * transformation parameters.
         */

        src =
            src.replace(
                /=w\d+-h\d+.*$/i,
                ""
            );


        /*
         * Convert common Blogger
         * sizes to s1600-rw.
         */

        src =
            src.replace(
                /\/s\d+(-rw)?\//i,
                "/s1600-rw/"
            );


        if(
            !images.includes(src)
        ) {

            images.push(src);

        }

    }


    return images;
}


/* =========================================================
   JSON
========================================================= */

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(
            data
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
