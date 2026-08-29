export async function onRequestGet() {

    return new Response(
        JSON.stringify({
            success: true,
            message:
                "Blogger duplicate comparison API is working.",
            original:
                "https://tollywoodboost.blogspot.com",
            imported:
                "https://tollyboost.blogspot.com",
            updated:
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
