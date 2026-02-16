/** Polymarket API URLs and configuration constants. */

export const RELAYER_URL = "https://relayer-v2.polymarket.com/";
export const CLOB_API_URL = "https://clob.polymarket.com";
export const POLYGON_CHAIN_ID = 137;

/** Remote signing URL – points to our backend's builder HMAC signing endpoint. */
export const REMOTE_SIGNING_URL = () =>
  typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/signing/sign`
    : "/api/v1/signing/sign";
