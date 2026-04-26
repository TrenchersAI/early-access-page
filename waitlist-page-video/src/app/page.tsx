import { headers } from "next/headers";
import HomeClient from "./home-client";

/** iOS in-app browsers (X/Twitter, Instagram, FB, LinkedIn, Discord, Line,
   WeChat, GSA, TikTok, Slack, Telegram) and Android Chrome WebView refuse
   `<video>` autoplay even with muted+playsinline. We swap in an animated WebP
   for those user agents — animated images have no autoplay restriction.
   The token list is conservative: each app has had a stable UA marker for
   years. The trailing `; wv\)` matches Android WebViews generically. */
const IN_APP_BROWSER_UA =
  /FBAN|FBAV|FB_IAB|Instagram|Twitter|LinkedInApp|Line|MicroMessenger|GSA|TikTok|Slack|Telegram|; wv\)/i;

export default async function Page() {
  const ua = (await headers()).get("user-agent") ?? "";
  return <HomeClient isInAppBrowser={IN_APP_BROWSER_UA.test(ua)} />;
}
