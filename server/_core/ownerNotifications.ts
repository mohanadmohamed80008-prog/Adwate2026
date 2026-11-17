import { ENV } from "./env";

export async function sendOwnerNotification(title: string, content: string) {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return false;
  const safeTitle = title.slice(0, 1200);
  const safeContent = content.slice(0, 20000);
  try {
    const response = await fetch(`${ENV.forgeApiUrl}/webdevtoken.v1.WebDevService/SendNotification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.forgeApiKey}`,
        "Content-Type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title: safeTitle, content: safeContent }),
    });
    if (!response.ok) {
      console.warn("[OwnerNotification] Delivery was not accepted:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[OwnerNotification] Delivery failed:", error instanceof Error ? error.message : String(error));
    return false;
  }
}
