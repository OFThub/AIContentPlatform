"use client";

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import RequireAuth from "../../components/RequireAuth";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI, analyticsAPI } from "../../services/api";

function Profile({ user }) {
  const { updateUser } = useAuth();
  // Initialised straight from props instead of being copied in via an effect.
  // The parent remounts this with key={user.id}, so a different user resets it.
  const [profile, setProfile] = useState({
    fullName: user.fullName || user.full_name || "",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || user.avatar_url || "",
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [engagement, setEngagement] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    analyticsAPI
      .getUserEngagement(user.id)
      .then((r) => setEngagement((r && r.data) || null))
      .catch(() => setEngagement(null));
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const response = await authAPI.updateProfile(profile);
      updateUser((response && response.data) || profile);
      setNotice({ ok: true, text: "Profile saved." });
    } catch (err) {
      const msg = err && err.response && err.response.data && err.response.data.message;
      setNotice({ ok: false, text: msg || "Could not save your profile." });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (passwords.newPassword.length < 8) {
      setNotice({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    try {
      await authAPI.changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setNotice({ ok: true, text: "Password changed." });
    } catch (err) {
      const msg = err && err.response && err.response.data && err.response.data.message;
      setNotice({ ok: false, text: msg || "Could not change your password." });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-1">Profile</h1>
      <p className="text-muted mb-6">{user && user.username} &middot; {user && user.email}</p>

      {notice && (
        <div
          className={
            "mb-6 p-3 rounded-lg border text-sm " +
            (notice.ok
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700")
          }
        >
          {notice.text}
        </div>
      )}

      {engagement && (
        <div className="card mb-6">
          <h2 className="mb-3">Your engagement</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-ink">{engagement.total_contents ?? 0}</p>
              <p className="text-sm text-muted">Contents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{engagement.total_views ?? 0}</p>
              <p className="text-sm text-muted">Views</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{engagement.total_likes ?? 0}</p>
              <p className="text-sm text-muted">Likes</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={saveProfile} className="card space-y-4 mb-6">
        <h2>Details</h2>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full name</label>
          <input id="fullName" className="input-field" value={profile.fullName}
                 onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
          <textarea id="bio" rows={3} className="input-field" value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        </div>
        <div>
          <label htmlFor="avatarUrl" className="block text-sm font-medium mb-1">Avatar URL</label>
          <input id="avatarUrl" className="input-field" value={profile.avatarUrl}
                 onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">Save profile</button>
      </form>

      <form onSubmit={changePassword} className="card space-y-4">
        <h2>Change password</h2>
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">Current password</label>
          <input id="currentPassword" type="password" className="input-field" value={passwords.currentPassword}
                 onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium mb-1">New password</label>
          <input id="newPassword" type="password" className="input-field" value={passwords.newPassword}
                 onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={8} />
        </div>
        <button type="submit" className="btn-primary">Change password</button>
      </form>
    </div>
  );
}


/**
 * RequireAuth guarantees a user before Profile mounts, and the key resets the
 * form state if the signed-in user ever changes.
 */
function ProfileGate() {
  const { user } = useAuth();
  if (!user) return null;
  return <Profile key={user.id} user={user} />;
}

export default function ProfilePage() {
  return (
    <Layout>
      <RequireAuth>
        <ProfileGate />
      </RequireAuth>
    </Layout>
  );
}
