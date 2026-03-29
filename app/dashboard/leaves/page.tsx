"use client";
import EmployeeGuard from "@/components/EmployeeGuard";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type UploadedLeave = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: any;
};

const leaveTypes = [
  { label: "Sick Leave", value: "sick_leave" },
  { label: "Annual Vacation", value: "annual_vacation" },
  { label: "Work Resumption", value: "work_resumption" },
];

export default function LeavesPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const [uploadingType, setUploadingType] = useState("");
  const [leaves, setLeaves] = useState<UploadedLeave[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      const userDoc = await getDocs(query(collection(db, "users")));
      const currentUser = userDoc.docs.find((doc) => doc.id === user.uid);
      if (currentUser) {
        setFullName((currentUser.data() as any).fullName || "");
      }

      await loadLeaves(user.uid);
      setLoadingPage(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function loadLeaves(uid: string) {
    try {
      const leavesRef = collection(db, "users", uid, "leaves");
      const q = query(leavesRef, orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);

      const items: UploadedLeave[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UploadedLeave, "id">),
      }));

      setLeaves(items);
    } catch (err: any) {
      setError(err.message || "Failed to load leaves.");
    }
  }

  async function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>,
    type: string
  ) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setError("");
    setSuccess("");
    setUploadingType(type);

    try {
      const safeFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(
        storage,
        `employee-files/${userId}/leaves/${type}/${safeFileName}`
      );

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const leaveData = {
        userId,
        fullName,
        type,
        fileName: file.name,
        fileUrl,
        uploadedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "users", userId, "leaves"), leaveData);
      await addDoc(collection(db, "leaveUploads"), leaveData);

      await loadLeaves(userId);
      setSuccess(`${type.replaceAll("_", " ")} uploaded successfully.`);
      e.target.value = "";
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploadingType("");
    }
  }

  if (loadingPage) {

    return (
      <EmployeeGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </main>
      </EmployeeGuard>
    );
  }

  return (
    <EmployeeGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>My Leaves</h1>
        <p style={styles.subtitle}>Upload your leave-related documents.</p>

        {error ? <p style={styles.error}>{error}</p> : null}
        {success ? <p style={styles.success}>{success}</p> : null}

        <div style={styles.uploadList}>
          {leaveTypes.map((leaveType) => (
            <div key={leaveType.value} style={styles.uploadCard}>
              <div>
                <h3 style={styles.uploadTitle}>{leaveType.label}</h3>
                <p style={styles.uploadText}>Choose a file to upload.</p>
              </div>

              <label style={styles.uploadButton}>
                {uploadingType === leaveType.value ? "Uploading..." : "Upload File"}
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileUpload(e, leaveType.value)}
                  disabled={uploadingType === leaveType.value}
                />
              </label>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Uploaded Leaves</h2>

          {leaves.length === 0 ? (
            <p style={styles.emptyText}>No leave files uploaded yet.</p>
          ) : (
            <div style={styles.documentList}>
              {leaves.map((leave) => (
                <div key={leave.id} style={styles.documentItem}>
                  <div>
                    <p style={styles.docName}>{leave.fileName}</p>
                    <p style={styles.docMeta}>
                      Type: {leave.type.replaceAll("_", " ")}
                    </p>
                  </div>

                  <a
                    href={leave.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.viewButton}
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <a href="/dashboard" style={styles.backButton}>
          Back to Dashboard
        </a>
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
  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "8px",
    textAlign: "center",
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
  uploadList: {
    display: "grid",
    gap: "14px",
    marginBottom: "28px",
  },
  uploadCard: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  uploadTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  uploadText: {
    margin: "6px 0 0 0",
    color: "#526071",
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
  section: {
    marginTop: "10px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  emptyText: {
    color: "#526071",
  },
  documentList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  documentItem: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  docName: {
    margin: 0,
    fontWeight: 600,
  },
  docMeta: {
    margin: "6px 0 0 0",
    color: "#526071",
    fontSize: "14px",
    textTransform: "capitalize",
  },
  viewButton: {
    background: "#163b73",
    color: "#ffffff",
    textDecoration: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  backButton: {
    display: "inline-block",
    marginTop: "24px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
};