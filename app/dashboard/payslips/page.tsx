"use client";

import EmployeeGuard from "@/components/EmployeeGuard";
import { useEffect, useState } from "react";
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
import { auth, db } from "@/lib/firebase";

type PayslipItem = {
  id: string;
  month: string;
  year: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: any;
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

export default function PayslipsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [error, setError] = useState("");

  const [requestMonth, setRequestMonth] = useState("");
  const [requestYear, setRequestYear] = useState(
    String(new Date().getFullYear())
  );
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const payslipsRef = collection(db, "users", user.uid, "payslips");
        const q = query(payslipsRef, orderBy("uploadedAt", "desc"));
        const snapshot = await getDocs(q);

        const items: PayslipItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PayslipItem, "id">),
        }));

        setPayslips(items);
      } catch (err: any) {
        setError(err.message || "Failed to load payslips.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handlePayslipRequest() {
    if (!userId) return;

    if (!requestMonth || !requestYear) {
      setRequestMessage("Please select a month and year.");
      return;
    }

    try {
      setRequestLoading(true);
      setRequestMessage("");
      setError("");

      await addDoc(collection(db, "users", userId, "payslipRequests"), {
        month: requestMonth,
        year: requestYear,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        type: "payslip_request",
        title: "New payslip request",
        message: `Employee requested payslip for ${requestMonth} ${requestYear}`,
        employeeUid: userId,
        month: requestMonth,
        year: requestYear,
        createdAt: serverTimestamp(),
        forAdmins: true,
      });

      setRequestMessage("Payslip request submitted successfully.");
      setRequestMonth("");
    } catch (err: any) {
      setRequestMessage(err.message || "Failed to submit payslip request.");
    } finally {
      setRequestLoading(false);
    }
  }

  if (loading) {
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
          <h1 style={styles.title}>My Payslips</h1>
          <p style={styles.subtitle}>View your uploaded payslip PDFs.</p>

          {error ? <p style={styles.error}>{error}</p> : null}

          <div style={styles.requestCard}>
            <h2 style={styles.requestTitle}>Request Payslip</h2>

            <div style={styles.requestRow}>
              <select
                value={requestMonth}
                onChange={(e) => setRequestMonth(e.target.value)}
                style={styles.select}
              >
                <option value="">Select month</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={requestYear}
                onChange={(e) => setRequestYear(e.target.value)}
                style={styles.yearInput}
                placeholder="Year"
              />
            </div>

            <button
              onClick={handlePayslipRequest}
              disabled={requestLoading}
              style={styles.requestButton}
            >
              {requestLoading ? "Submitting..." : "Request Payslip"}
            </button>

            {requestMessage ? (
              <p style={styles.requestMessage}>{requestMessage}</p>
            ) : null}
          </div>

          {payslips.length === 0 ? (
            <p style={styles.emptyText}>No payslips uploaded yet.</p>
          ) : (
            <div style={styles.list}>
              {payslips.map((payslip) => (
                <div key={payslip.id} style={styles.item}>
                  <div>
                    <p style={styles.fileName}>{payslip.fileName}</p>
                    <p style={styles.meta}>
                      {payslip.month}/{payslip.year}
                    </p>
                  </div>

                  <a
                    href={payslip.fileUrl}
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
  emptyText: {
    textAlign: "center",
    color: "#526071",
  },
  requestCard: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    background: "#ffffff",
  },
  requestTitle: {
    margin: "0 0 12px 0",
    fontSize: "22px",
    fontWeight: 700,
    color: "#0f172a",
  },
  requestRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  select: {
    flex: 1,
    minWidth: "200px",
    padding: "10px 12px",
    border: "1px solid #dce3ee",
    borderRadius: "10px",
    fontSize: "16px",
    color: "#0f172a",
    background: "#ffffff",
  },
  yearInput: {
    width: "140px",
    padding: "10px 12px",
    border: "1px solid #dce3ee",
    borderRadius: "10px",
    fontSize: "16px",
    color: "#0f172a",
    background: "#ffffff",
  },
  requestButton: {
    background: "#163b73",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
  },
  requestMessage: {
    marginTop: "12px",
    color: "#526071",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  item: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  fileName: {
    margin: 0,
    fontWeight: 600,
    color: "#0f172a",
  },
  meta: {
    margin: "6px 0 0 0",
    color: "#526071",
    fontSize: "14px",
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