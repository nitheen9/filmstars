export async function onRequestGet(context) {

    const url =
        new URL(
            context.request.url
        );


    const action =
        url.searchParams.get(
            "action"
        );


    if (
        action === "test"
    ) {

        return new Response(
            JSON.stringify({
                success: true,
                message:
                    "Blogger compare API is working."
            }),
            {
                headers: {
                    "Content-Type":
                        "application/json; charset=UTF-8"
                }
            }
        );
    }


    return new Response(
        JSON.stringify({
            success: true,
            message:
                "Blogger compare API is available."
        }),
        {
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8"
            }
        }
    );
}
