// lib/premiumEmail.js  (client side - used by the admin panel)
// Asks the server to email a user right after an admin grants them Premium.
export async function sendPremiumEmail(adminUser, targetUid) {
  try {
    if (!adminUser || !targetUid) return false;
    const idToken = await adminUser.getIdToken();
    const res = await fetch('/api/premium-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, uid: targetUid }),
    });
    return res.ok;
  } catch (err) {
    console.log('Premium email error:', err && err.message);
    return false;
  }
}
