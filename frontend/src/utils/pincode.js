/**
 * Pincode utilities.
 */
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function lookupPincode(pincode) {
  const resp = await fetch(`${BACKEND}/api/voter/lookup?pincode=${pincode}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Pincode lookup failed');
  }
  return resp.json();
}

export async function saveProfile(profileData, idToken) {
  const resp = await fetch(`${BACKEND}/api/voter/save-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(profileData),
  });
  if (!resp.ok) throw new Error('Failed to save profile');
  return resp.json();
}

export async function getProfile(idToken) {
  const resp = await fetch(`${BACKEND}/api/voter/profile`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!resp.ok) {
    console.error(`❌ getProfile failed: HTTP ${resp.status}`, await resp.text().catch(() => ''));
    return null;
  }
  const data = await resp.json();
  console.log('✅ getProfile response:', data);
  return data.profile;
}
