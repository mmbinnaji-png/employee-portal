"use client";
import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type LeaveUpload = {
  id: string;
  userId: string;
  fullName: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: any;
};

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLeaves() {
      try {
        const snapshot = await getDocs(
          query(collection(db, "leaveUploads"), orderBy("uploadedAt", "desc"))
        );

        const items: LeaveUpload[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<LeaveUpload, "id">),
        }));

        setLeaves(items);
      } catch (err: any) {
        setError(err.message || "Failed to load leave uploads.");
      } finally {
        setLoading(false);
      }
    }

    loadLeaves();
  }, []);

  return (
    <AdminGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Recent Leave Uploads</h1>
        <p style={styles.subtitle}>Review submitted leave-related files.</p>

        {loading ? <p style={styles.info}>Loading leave uploads...</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}

        {!loading && !error && leaves.length === 0 ? (
          <p style={styles.info}>No leave uploads found.</p>
        ) : null}

        <div style={styles.list}>
          {leaves.map((leave) => (
            <div key={leave.id} style={styles.item}>
  <div style={styles.itemTop}>
    <div style={styles.itemInfo}>
      <p style={styles.name}>{leave.fullName}</p>

      <p style={styles.meta}>
        Type: {leave.type.replaceAll("_", " ")}
      </p>

      <p style={styles.meta}>File: {leave.fileName}</p>
    </div>
  </div>

  <div style={styles.itemButtons}>
    <a
      href={`/admin/employees/${leave.userId}`}
      style={styles.secondaryButton}
    >
      View Employee
    </a>

    <a
      href={leave.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.viewButton}
    >
      View File
    </a>
  </div>
</div>
          ))}
        </div>

        <a href="/admin" style={styles.backButton}>
          Back to Admin Dashboard
        </a>
      </div>
    </main>
    </AdminGuard>
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
    maxWidth: "1000px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "8px",
  },
  subtitle: {
  textAlign: "center",
  color: "#475569",
  marginBottom: "24px",
  fontSize: "16px",
},
  info: {
  textAlign: "center",
  color: "#475569",
  marginBottom: "16px",
  fontSize: "15px",
},
  error: {
    textAlign: "center",
    color: "#c62828",
    marginBottom: "16px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  item: {
  border: "1px solid #dce3ee",
  borderRadius: "16px",
  padding: "18px",
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
},
  name: {
  margin: 0,
  fontWeight: 800,
  fontSize: "22px",
  color: "#0f172a",
  lineHeight: 1.3,
},
  meta: {
  margin: "8px 0 0 0",
  color: "#334155",
  fontSize: "16px",
  lineHeight: 1.5,
},
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  itemTop: {
  display: "flex",
  flexDirection: "column",
},

itemInfo: {
  display: "flex",
  flexDirection: "column",
},

itemButtons: {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "4px",
},
  viewButton: {
  background: "#163b73",
  color: "#ffffff",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "140px",
},
  secondaryButton: {
  background: "#eef4fb",
  color: "#163b73",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  border: "1px solid #dce3ee",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "140px",
},
  backButton: {
    display: "inline-block",
    marginTop: "28px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
};