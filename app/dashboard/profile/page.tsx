"use client";

import EmployeeGuard from "@/components/EmployeeGuard";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type ProfileData = {
  fullName: string;
  pfNumber: string;
  email: string;
  phoneNumber: string;
  directManagerName: string;
  profilePhotoUrl: string;
};

const initialProfile: ProfileData = {
  fullName: "",
  pfNumber: "",
  email: "",
  phoneNumber: "",
  directManagerName: "",
  profilePhotoUrl: "",
};

export default function ProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [loadingPage, setLoadingPage] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          setProfile({
            fullName: userData.fullName || "",
            pfNumber: userData.pfNumber || userData.employeeId || "",
            email: userData.email || user.email || "",
            phoneNumber: userData.phoneNumber || userData.phone || "",
            directManagerName: userData.directManagerName || "",
            profilePhotoUrl: userData.profilePhotoUrl || "",
          });
        } else {
          setProfile({
            ...initialProfile,
            email: user.email || "",
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoadingPage(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave() {
    if (!userId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          fullName: profile.fullName,
          pfNumber: profile.pfNumber,
          employeeId: profile.pfNumber,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          phone: profile.phoneNumber,
          directManagerName: profile.directManagerName,
          profilePhotoUrl: profile.profilePhotoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess("Profile updated successfully.");
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const safeFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(
        storage,
        `employee-files/${userId}/profile/${safeFileName}`
      );

      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      await setDoc(
        doc(db, "users", userId),
        {
          profilePhotoUrl: photoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((prev) => ({
        ...prev,
        profilePhotoUrl: photoUrl,
      }));

      setSuccess("Profile photo uploaded successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  if (loadingPage) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <EmployeeGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <a href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </a>

          <h1 style={styles.title}>My Profile</h1>
          <p style={styles.subtitle}>View and update your profile details.</p>

          {error ? <p style={styles.error}>{error}</p> : null}
          {success ? <p style={styles.success}>{success}</p> : null}

          <div style={styles.photoSection}>
            <div style={styles.photoWrapper}>
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  style={styles.photo}
                />
              ) : (
                <div style={styles.photoPlaceholder}>No Photo</div>
              )}
            </div>

            {editMode ? (
              <label style={styles.uploadButton}>
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            ) : null}
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                name="fullName"
                value={profile.fullName}
                onChange={handleInputChange}
                disabled={!editMode}
                style={editMode ? styles.input : styles.disabledInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>PF Number</label>
              <input
                name="pfNumber"
                value={profile.pfNumber}
                onChange={handleInputChange}
                disabled={!editMode}
                style={editMode ? styles.input : styles.disabledInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                disabled={!editMode}
                style={editMode ? styles.input : styles.disabledInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleInputChange}
                disabled={!editMode}
                style={editMode ? styles.input : styles.disabledInput}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Direct Manager Name</label>
              <input
                name="directManagerName"
                value={profile.directManagerName}
                onChange={handleInputChange}
                disabled={!editMode}
                style={editMode ? styles.input : styles.disabledInput}
              />
            </div>
          </div>

          <div style={styles.buttonRow}>
            {!editMode ? (
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => setEditMode(true)}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    setEditMode(false);
                    setError("");
                    setSuccess("");
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </EmployeeGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "900px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  backButton: {
    display: "inline-block",
    marginBottom: "18px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "8px",
    textAlign: "center",
    color: "#0f172a",
  },
  subtitle: {
    textAlign: "center",
    color: "#526071",
    marginBottom: "24px",
  },
  error: {
    color: "#c62828",
    marginBottom: "12px",
    textAlign: "center",
  },
  success: {
    color: "#2e7d32",
    marginBottom: "12px",
    textAlign: "center",
  },
  photoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  photoWrapper: {
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#eef3f9",
    border: "2px solid #dce3ee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    color: "#526071",
    fontWeight: 600,
    fontSize: "14px",
  },
  uploadButton: {
    background: "#163b73",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "8px",
    fontWeight: 600,
    color: "#163b73",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #dce3ee",
    outline: "none",
    fontSize: "15px",
    color: "#0f172a",
    background: "#ffffff",
  },
  disabledInput: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #dce3ee",
    fontSize: "15px",
    color: "#526071",
    background: "#f8fbff",
  },
  buttonRow: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#163b73",
    color: "#ffffff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "#eef3f9",
    color: "#163b73",
    border: "1px solid #dce3ee",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
};