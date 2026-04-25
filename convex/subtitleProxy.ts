"use node";

import { internalAction } from "./_generated/server";
import * as Encoding from "encoding-japanese";

export const decodeSubtitle = internalAction({
  args: {},
  handler: async (ctx, args) => {
    // This will be called from the HTTP action with the storage ID
    return null;
  },
});

// Helper function to decode subtitle content
export async function decodeSubtitleContent(
  storageUrl: string,
  format: string
): Promise<string> {
  const response = await fetch(storageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // For SMI files, detect and convert encoding
  if (format === "smi") {
    // Detect encoding
    const detected = Encoding.detect(uint8Array);
    console.log(`Detected encoding: ${detected}`);
    
    // Convert to Unicode array
    const unicodeArray = Encoding.convert(uint8Array, {
      to: "UNICODE",
      from: detected || "AUTO",
    });
    
    // Convert to string
    const text = Encoding.codeToString(unicodeArray);
    
    console.log(`Successfully decoded SMI, length: ${text.length}`);
    return text;
  }
  
  // Default: return as UTF-8
  return new TextDecoder("utf-8").decode(uint8Array);
}
