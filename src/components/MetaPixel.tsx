"use client";

import { useEffect } from "react";
import Script from "next/script";

interface MetaPixelProps {
  pixelId?: string;
  enabled?: boolean;
}

export function MetaPixel({ pixelId, enabled = true }: MetaPixelProps) {
  useEffect(() => {
    if (!pixelId || !enabled) return;

    // Deduplication event ID for initial PageView
    const eventId = "pv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView", {}, { eventID: eventId });
    }

    // Call server-side CAPI for PageView
    fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "PageView",
        event_id: eventId,
        custom_data: { page_url: window.location.href }
      })
    }).catch(() => {});
  }, [pixelId, enabled]);

  if (!pixelId || !enabled) return null;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
          `
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt="Facebook Pixel"
        />
      </noscript>
    </>
  );
}

/**
 * Utility to fire Meta Browser Pixel & Server CAPI simultaneously
 */
export async function trackCustomEvent(
  eventName: "ViewContent" | "InitiateCheckout" | "Purchase",
  data: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_ids?: string[];
    user_email?: string;
    order_id?: string;
  }
) {
  const eventId = `${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Browser Pixel with eventID
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName, {
      currency: data.currency || "BDT",
      value: data.value || 0,
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: "product"
    }, { eventID: eventId });
  }

  // 2. Server CAPI with identical eventID for 100% deduplicated tracking
  try {
    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        user_email: data.user_email,
        custom_data: {
          currency: data.currency || "BDT",
          value: data.value || 0,
          content_name: data.content_name,
          content_ids: data.content_ids,
          order_id: data.order_id
        }
      })
    });
  } catch (err) {
    console.error("CAPI dispatch failed:", err);
  }
}
