async function testAll() {
  console.log("=== 1. Testing Product Page AI Chatbot Presence ===");
  const prodRes = await fetch("https://tootls.pages.dev/tools/mouza-map");
  const prodHtml = await prodRes.text();
  const hasChatbotProd = prodHtml.includes("ai_chat_root") && prodHtml.includes("AI হেল্প ডেস্ক");
  console.log("Product Page Chatbot present:", hasChatbotProd, "Status:", prodRes.status);

  console.log("\n=== 2. Testing Checkout Page AI Chatbot Presence ===");
  const checkRes = await fetch("https://tootls.pages.dev/checkout/mouza-map");
  const checkHtml = await checkRes.text();
  const hasChatbotCheck = checkHtml.includes("ai_chat_root") && checkHtml.includes("AI হেল্প ডেস্ক");
  console.log("Checkout Page Chatbot present:", hasChatbotCheck, "Status:", checkRes.status);

  console.log("\n=== 3. Testing Subscription Trigger Cron Endpoint ===");
  const cronRes = await fetch("https://tootls.pages.dev/api/admin/subscriptions/trigger-cron", {
    method: "POST"
  });
  const cronData = await cronRes.json();
  console.log("Subscription Cron Response:", cronData);

  console.log("\n=== 4. Testing Forgot Password Endpoint ===");
  const forgotRes = await fetch("https://tootls.pages.dev/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nonexistent_test@example.com" })
  });
  const forgotData = await forgotRes.json();
  console.log("Forgot Password (non-existent email):", forgotData);

  // Test with registered admin email or existing user
  const adminForgotRes = await fetch("https://tootls.pages.dev/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sohagbdmt@gmail.com" })
  });
  console.log("Forgot Password (admin email status):", adminForgotRes.status);
  try {
    const adminForgotData = await adminForgotRes.json();
    console.log("Forgot Password result:", adminForgotData);
  } catch(e) {}
}

testAll().catch(console.error);
