export async function onRequestGet(context) {

    const url =
        new URL(context.request.url);

    return new Response(
        JSON.stringify({
            success: true,
            message:
                "Blogger duplicate comparison API is working.",
            endpoint:
                "/api/blogger-compare"
        }),
        {
            status: 200,
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
