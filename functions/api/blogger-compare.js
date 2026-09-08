export async function onRequestGet() {

    return new Response(
        JSON.stringify({
            success: true,
            original:
                "https://tollywoodboost.blogspot.com",
            imported:
                "https://tollyboost.blogspot.com",
            message:
                "Blogger duplicate comparison API is working.",
            time:
                new Date().toISOString()
        }),
        {
            status: 200,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
