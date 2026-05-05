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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type RequestItem = {
  id: string;
  requestType: string;
  status: string;
  fileName?: string;
  fileUrl?: string;
  month?: string;
  year?: string;
  employeeName?: string;
  employeeEmail?: string;
  createdAt?: any;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function RequestsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [uploadingType, setUploadingType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

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
      await loadRequests(user.uid);
      setLoadingPage(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function loadRequests(uid: string) {
    try {
      const requestRef = collection(db, "users", uid, "requests");
      const q = query(requestRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const items: RequestItem[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<RequestItem, "id">),
      }));

      setRequests(items);
    } catch (err: any) {
      setError(err.message || "Failed to load requests.");
    }
  }

  async function createWorkPermitRequest() {
    if (!userId) return;

    setError("");
    setSuccess("");
    setUploadingType("work_permit");

    try {
      await addDoc(collection(db, "users", userId, "requests"), {
        requestType: "work_permit",
        status: "pending",
        employeeName,
        employeeEmail,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        type: "employee_request",
        title: "New employee request",
        message: `Work permit requested by ${employeeName || "employee"}`,
        employeeUid: userId,
        employeeName,
        employeeEmail,
        requestType: "work_permit",
        createdAt: serverTimestamp(),
        forAdmins: true,
      });

      await loadRequests(userId);
      setSuccess("Work Permit request submitted successfully.");
    } catch (err: any) {
      setError(err.message || "Request failed.");
    } finally {
      setUploadingType("");
    }
  }

  async function handleRequestWithFile(
    e: ChangeEvent<HTMLInputElement>,
    requestType: "salary_certificate" | "id_card"
  ) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setError("");
    setSuccess("");
    setUploadingType(requestType);

    try {
      const safeFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(
        storage,
        `employee-files/${userId}/requests/${requestType}/${safeFileName}`
      );

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "users", userId, "requests"), {
        requestType,
        status: "pending",
        fileName: file.name,
        fileUrl,
        employeeName,
        employeeEmail,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        type: "employee_request",
        title: "New employee request",
        message: `${requestType.replaceAll("_", " ")} requested by ${employeeName || "employee"}`,
        employeeUid: userId,
        employeeName,
        employeeEmail,
        requestType,
        fileName: file.name,
        fileUrl,
        createdAt: serverTimestamp(),
        forAdmins: true,
      });

      await loadRequests(userId);
      setSuccess(`${requestType.replaceAll("_", " ")} request submitted successfully.`);
      e.target.value = "";
    } catch (err: any) {
      setError(err.message || "Request failed.");
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
            Back to Dashboard
          </a>

          <h1 style={styles.title}>Requests</h1>
          <p style={styles.subtitle}>Submit employee requests here.</p>

          {error ? <p style={styles.error}>{error}</p> : null}
          {success ? <p style={styles.success}>{success}</p> : null}

          <div style={styles.requestList}>
            <div style={styles.requestCard}>
              <div>
                <h3 style={styles.requestTitle}>Request Salary Certificate</h3>
                <p style={styles.requestText}>
                  For this request, upload your Civil ID.
                </p>
              </div>

              <label style={styles.requestButton}>
                {uploadingType === "salary_certificate" ? "Uploading..." : "Upload Civil ID"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => handleRequestWithFile(e, "salary_certificate")}
                  disabled={uploadingType === "salary_certificate"}
                />
              </label>
            </div>

            <div style={styles.requestCard}>
              <div>
                <h3 style={styles.requestTitle}>Request Work Permit</h3>
                <p style={styles.requestText}>
                  Submit work permit request directly.
                </p>
              </div>

              <button
                style={styles.requestButtonPlain}
                onClick={createWorkPermitRequest}
                disabled={uploadingType === "work_permit"}
              >
                {uploadingType === "work_permit" ? "Submitting..." : "Request Work Permit"}
              </button>
            </div>

            <div style={styles.requestCard}>
              <div>
                <h3 style={styles.requestTitle}>Request ID Card</h3>
                <p style={styles.requestText}>
                  For this request, upload your personal photo.
                </p>
              </div>

              <label style={styles.requestButton}>
                {uploadingType === "id_card" ? "Uploading..." : "Upload Personal Photo"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleRequestWithFile(e, "id_card")}
                  disabled={uploadingType === "id_card"}
                />
              </label>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>My Requests</h2>

            {requests.length === 0 ? (
              <p style={styles.emptyText}>No requests submitted yet.</p>
            ) : (
              <div style={styles.requestHistoryList}>
                {requests.map((item) => (
                  <div key={item.id} style={styles.requestHistoryCard}>
                    <div>
                      <p style={styles.requestHistoryName}>
                        {item.requestType.replaceAll("_", " ")}
                      </p>
                      <p style={styles.requestHistoryMeta}>
                        Status: {item.status}
                      </p>
                      {item.fileName ? (
                        <p style={styles.requestHistoryMeta}>File: {item.fileName}</p>
                      ) : null}
                    </div>

                    {item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.viewButton}
                      >
                        View
                      </a>
                    ) : null}
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
  requestList: {
    display: "grid",
    gap: "14px",
    marginBottom: "28px",
  },
  requestCard: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  requestTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "#0f172a",
  },
  requestText: {
    margin: "6px 0 0 0",
    color: "#526071",
    fontSize: "14px",
  },
  requestButton: {
    background: "#163b73",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  requestButtonPlain: {
    background: "#163b73",
    color: "#ffffff",
    border: "none",
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
  requestHistoryList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  requestHistoryCard: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  requestHistoryName: {
    margin: 0,
    fontWeight: 600,
    color: "#0f172a",
    textTransform: "capitalize",
  },
  requestHistoryMeta: {
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