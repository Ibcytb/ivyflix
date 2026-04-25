import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { decodeSubtitleContent } from "./subtitleProxy";

const http = httpRouter();

// Proxy endpoint to handle subtitle encoding conversion
http.route({
  path: "/subtitle-proxy",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const storageId = url.searchParams.get("storageId");
    const format = url.searchParams.get("format");
    
    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }
    
    // Get the storage URL
    const storageUrl = await ctx.storage.getUrl(storageId as any);
    if (!storageUrl) {
      return new Response("File not found", { status: 404 });
    }
    
    try {
      // Decode the subtitle content
      const text = await decodeSubtitleContent(storageUrl, format || "");
      
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error decoding subtitle:", error);
      return new Response("Error decoding subtitle", { status: 500 });
    }
  }),
});

export default http;
