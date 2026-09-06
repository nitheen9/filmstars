const BLOG = "https://tollyboost.blogspot.com";

export async function onRequestGet(context) {
    const url = new URL(context.request.url);

    const year = Number(
        url.searchParams.get("year")
    );

    if (
        !Number.isInteger(year) ||
        year < 2010 ||
        year > 2026
    ) {
        return json(
            {
                success: false,
                error: "Year must be between 2010 and 2026."
            },
            400
        );
    }

    try {
        const result = await buildYearIndex(year);

        return json({
            success: true,
            blog: BLOG,
            year: year,
            count: result.posts.length,
            sitemapCount: result.sitemapUrls,
            posts: result.posts
        });
    }
    catch (error) {
        return json(
            {
                success: false,
                error:
                    error?.message ||
                    "Unable to scan Blogger sitemap."
            },
            502
        );
    }
}


/*
=========================================================
BUILD YEAR INDEX
=========================================================
*/

async function buildYearIndex(year) {

    const visited = new Set();

    const postMap = new Map();

    const rootSitemap =
        BLOG +
        "/sitemap.xml?cb=" +
        Date.now();

    await readSitemap(
        rootSitemap,
        year,
        visited,
        postMap
    );

    const posts =
        Array.from(
            postMap.values()
        );

    posts.sort(
        (a, b) =>
            a.url.localeCompare(
                b.url
            )
    );

    return {
        posts,
        sitemapUrls: visited.size
    };
}


/*
=========================================================
READ SITEMAP
=========================================================
*/

async function readSitemap(
    sitemapUrl,
    year,
    visited,
    postMap
) {

    const cleanUrl =
        removeCacheParameter(
            sitemapUrl
        );

    if (
        visited.has(cleanUrl)
    ) {
        return;
    }

    visited.add(cleanUrl);

    const xml =
        await fetchText(
            cleanUrl
        );

    if (!xml) {
        return;
    }

    /*
     * Sitemap index:
     *
     * <sitemap>
     *   <loc>...</loc>
     * </sitemap>
     */

    const sitemapLocations =
        extractTags(
            xml,
            "loc"
        );

    const hasSitemapIndex =
        /<sitemap[\s>]/i.test(
            xml
        );


    if (hasSitemapIndex) {

        for (
            const childUrl of
            sitemapLocations
        ) {

            /*
             * Ignore sitemap-pages.xml
             * or unrelated sitemaps.
             */
            if (
                !isUsefulSitemap(
                    childUrl
                )
            ) {
                continue;
            }

            await readSitemap(
                childUrl,
                year,
                visited,
                postMap
            );
        }

        return;
    }


    /*
     * Normal URL sitemap.
     */

    const urls =
        sitemapLocations;


    for (
        const postUrl of urls
    ) {

        const normalized =
            normalizePostUrl(
                postUrl
            );

        if (!normalized) {
            continue;
        }

        if (
            !matchesYear(
                normalized,
                year
            )
        ) {
            continue;
        }

        if (
            postMap.has(
                normalized
            )
        ) {
            continue;
        }

        postMap.set(
            normalized,
            {
                url: normalized,
                title: extractTitleFromUrl(
                    normalized
                )
            }
        );
    }
}


/*
=========================================================
USEFUL SITEMAP
=========================================================
*/

function isUsefulSitemap(url) {

    if (!url) {
        return false;
    }

    const lower =
        url.toLowerCase();

    if (
        lower.includes(
            "sitemap-pages"
        )
    ) {
        return false;
    }

    return (
        lower.includes(
            "tollyboost.blogspot.com"
        ) &&
        lower.includes(
            "sitemap"
        )
    );
}


/*
=========================================================
FETCH XML
=========================================================
*/

async function fetchText(
    url
) {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= 5;
        attempt++
    ) {

        try {

            const cacheBust =
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2);

            const separator =
                url.includes("?")
                    ? "&"
                    : "?";

            const requestUrl =
                url +
                separator +
                "_cb=" +
                encodeURIComponent(
                    cacheBust
                );


            const response =
                await fetch(
                    requestUrl,
                    {
                        method: "GET",
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 Filmstars Yearly Scanner",
                            "Cache-Control":
                                "no-cache",
                            "Pragma":
                                "no-cache",
                            "Accept":
                                "application/xml,text/xml,text/plain,*/*"
                        },
                        cf: {
                            cacheTtl: 0,
                            cacheEverything: false
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Blogger sitemap HTTP " +
                    response.status
                );
            }


            const text =
                await response.text();


            if (
                !text ||
                text.length < 20
            ) {

                throw new Error(
                    "Blogger sitemap returned empty content."
                );
            }


            /*
             * Detect HTML error pages.
             */

            const first =
                text
                    .trim()
                    .substring(
                        0,
                        100
                    )
                    .toLowerCase();


            if (
                first.startsWith(
                    "<!doctype html"
                ) ||
                first.startsWith(
                    "<html"
                )
            ) {

                throw new Error(
                    "Blogger returned HTML instead of XML."
                );
            }


            return text;

        }
        catch (error) {

            lastError = error;

            if (
                attempt >= 5
            ) {
                break;
            }

            await sleep(
                attempt * 2500
            );
        }
    }


    throw (
        lastError ||
        new Error(
            "Unable to fetch sitemap."
        )
    );
}


/*
=========================================================
EXTRACT XML TAGS
=========================================================
*/

function extractTags(
    xml,
    tagName
) {

    const values = [];

    const regex =
        new RegExp(
            "<" +
            tagName +
            "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" +
            tagName +
            ">",
            "gi"
        );

    let match;

    while (
        (match = regex.exec(xml)) !== null
    ) {

        const value =
            decodeXml(
                match[1]
                    .trim()
            );

        if (value) {
            values.push(value);
        }
    }

    return values;
}


/*
=========================================================
NORMALIZE POST URL
=========================================================
*/

function normalizePostUrl(
    url
) {

    try {

        const parsed =
            new URL(url);

        if (
            parsed.hostname
                .toLowerCase() !==
            "tollyboost.blogspot.com"
        ) {
            return "";
        }

        const path =
            parsed.pathname;

        /*
         * Must be an individual Blogger
         * post URL:
         *
         * /2015/11/example.html
         */

        if (
            !/^\/\d{4}\/\d{2}\/.+\.html$/i.test(
                path
            )
        ) {
            return "";
        }

        return (
            "https://tollyboost.blogspot.com" +
            path
        );

    }
    catch {
        return "";
    }
}


/*
=========================================================
MATCH YEAR
=========================================================
*/

function matchesYear(
    url,
    year
) {

    try {

        const pathname =
            new URL(
                url
            ).pathname;

        const pattern =
            new RegExp(
                "^/" +
                year +
                "/\\d{2}/.+\\.html$",
                "i"
            );

        return pattern.test(
            pathname
        );

    }
    catch {
        return false;
    }
}


/*
=========================================================
TITLE FROM URL
=========================================================
*/

function extractTitleFromUrl(
    url
) {

    try {

        const pathname =
            new URL(
                url
            ).pathname;

        const last =
            pathname
                .split("/")
                .pop() || "";

        const slug =
            last
                .replace(
                    /\.html$/i,
                    ""
                );

        return slug
            .replace(
                /[-_]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    }
    catch {
        return "";
    }
}


/*
=========================================================
XML DECODE
=========================================================
*/

function decodeXml(
    value
) {

    return String(value)
        .replace(
            /&amp;/gi,
            "&"
        )
        .replace(
            /&lt;/gi,
            "<"
        )
        .replace(
            /&gt;/gi,
            ">"
        )
        .replace(
            /&quot;/gi,
            '"'
        )
        .replace(
            /&#39;/gi,
            "'"
        );
}


/*
=========================================================
REMOVE CACHE PARAMETER
=========================================================
*/

function removeCacheParameter(
    url
) {

    try {

        const parsed =
            new URL(url);

        parsed.searchParams.delete(
            "_cb"
        );

        return parsed.toString();

    }
    catch {
        return url;
    }
}


/*
=========================================================
SLEEP
=========================================================
*/

function sleep(
    ms
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


/*
=========================================================
JSON RESPONSE
=========================================================
*/

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(
            data
        ),
        {
            status: status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",
                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma":
                    "no-cache",
                "Expires":
                    "0",
                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
