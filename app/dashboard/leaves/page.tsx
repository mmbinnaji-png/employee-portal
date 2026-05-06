"use client";

import EmployeeGuard from "@/components/EmployeeGuard";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type LeaveItem = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: any;
  employeeName?: string;
  employeeEmail?: string;
};

const leaveTypes = [
  { label: "Sick Leave", value: "sick_leave" },
  { label: "Annual Vacation", value: "annual_vacation" },
  { label: "Work Resumption", value: "work_resumption" },
];

export default function LeavesPage() {
const router = useRouter();
const [userId, setUserId] = useState("");
const [employeeName, setEmployeeName] = useState("");
const [employeeEmail, setEmployeeEmail] = useState("");
const [loadingPage, setLoadingPage] = useState(true);
const [uploadingType, setUploadingType] = useState("");
const [leaves, setLeaves] = useState<LeaveItem[]>([]);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setEmployeeName(userData.fullName || "");
          setEmployeeEmail(userData.email || user.email || "");
        } else {
          setEmployeeEmail(user.email || "");
        }

        setUserId(user.uid);
        await loadLeaves(user.uid);
      } catch (err: any) {
        setError(err.message || "Failed to load leaves.");
      } finally {
        setLoadingPage(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function loadLeaves(uid: string) {
    try {
      const leavesRef = collection(db, "users", uid, "leaves");
      const q = query(leavesRef, orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);

      const items: LeaveItem[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<LeaveItem, "id">),
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

      await addDoc(collection(db, "users", userId, "leaves"), {
        type,
        fileName: file.name,
        fileUrl,
        employeeName,
        employeeEmail,
        uploadedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        type: "leave_upload",
        title: "New leave file uploaded",
        message: `${type.replaceAll("_", " ")} uploaded by ${employeeName || "employee"}`,
        employeeUid: userId,
        employeeName,
        employeeEmail,
        leaveType: type,
        fileName: file.name,
        fileUrl,
        createdAt: serverTimestamp(),
        forAdmins: true,
        read: false,
      });

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
            ← Back to Dashboard
          </a>

          <h1 style={styles.title}>My Leaves</h1>
          <p style={styles.subtitle}>Upload your leave-related files.</p>

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
            <h2 style={styles.sectionTitle}>Uploaded Leave Files</h2>

            {leaves.length === 0 ? (
              <p style={styles.emptyText}>No leave files uploaded yet.</p>
            ) : (
              <div style={styles.leaveList}>
                {leaves.map((leave) => (
                  <div key={leave.id} style={styles.leaveItem}>
                    <div>
                      <p style={styles.leaveName}>{leave.fileName}</p>
                      <p style={styles.leaveMeta}>
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
    marginBottom: "16px",
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
    color: "#0f172a",
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
    color: "#0f172a",
  },
  emptyText: {
    color: "#526071",
  },
  leaveList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  leaveItem: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  leaveName: {
    margin: 0,
    fontWeight: 600,
    color: "#0f172a",
  },
  leaveMeta: {
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
};