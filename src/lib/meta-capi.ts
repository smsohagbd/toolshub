import { getSiteSettings } from "./db";
import { TrackingEvent } from "./types";

/**
 * Sends Server-side event to Meta Conversions API (CAPI)
 * Combines with client-side Facebook Pixel for 100% accurate event matching and ROAS claiming.
 */
export async function sendMetaCAPIEvent(event: TrackingEvent) {
  try {
    const settings = await getSiteSettings();
    if (!settings || !settings.facebook_tracking_enabled || !settings.facebook_pixel_id || !settings.facebook_access_token) {
      return { success: false, reason: "Facebook tracking or credentials not configured" };
    }

    const pixelId = settings.facebook_pixel_id.trim();
    const accessToken = settings.facebook_access_token.trim();

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const payload: any = {
      data: [
        {
          event_name: event.event_name,
          event_time: currentTimestamp,
          event_id: event.event_id, // Identical to browser pixel eventID for Deduplication
          action_source: "website",
          user_data: {
            client_ip_address: event.user_ip || "127.0.0.1",
            client_user_agent: event.user_agent || "Mozilla/5.0",
            ...(event.user_email ? { em: [await hashSHA256(event.user_email.toLowerCase().trim())] } : {})
          },
          custom_data: {
            currency: event.custom_data?.currency || "BDT",
            value: event.custom_data?.value || 0,
            content_name: event.custom_data?.content_name,
            content_ids: event.custom_data?.content_ids,
            content_type: event.custom_data?.content_type || "product",
            order_id: event.custom_data?.order_id
          }
        }
      ]
    };

    if (settings.facebook_test_event_code) {
      payload.test_event_code = settings.facebook_test_event_code.trim();
    }

    const endpoint = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return { success: response.ok, result };
  } catch (error) {
    console.error("Meta CAPI Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Standard Web Crypto SHA256 hashing for Meta user parameters (email, phone)
 */
async function hashSHA256(str: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
