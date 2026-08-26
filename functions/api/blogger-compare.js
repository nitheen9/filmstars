export async function onRequestGet() {

    return new Response(
        JSON.stringify({
            success: true,
            message:
                "Blogger comparison API is running.",
            blogs: {
                tollywoodboost:
                    "https://tollywoodboost.blogspot.com",
                tollyboost:
                    "https://tollyboost.blogspot.com"
            }
        }),
        {
            status: 200,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Access-Control-Allow-Origin":
                    "*",

                "Cache-Control":
                    "no-store"
            }
        }
    );
}
