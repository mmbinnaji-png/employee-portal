"use client";

import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type AdminLeaveItem = {
  id: string;
  userId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  employeeName?: string;
  employeeEmail?: string;
  createdAt?: any;
  done?: boolean;
};

export default function AdminLeavesPage() {
  const [items, setItems] = useState<AdminLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      setError("");

      const q = query(
        collection(db, "leaveUploads"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const results: AdminLeaveItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AdminLeaveItem, "id">),
      }));

      setItems(results);
    } catch (err: any) {
      setError(err.message || "Failed to load leave uploads.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDone(id: string, currentValue: boolean | undefined) {
    try {
      await updateDoc(doc(db, "leaveUploads", id), {
        done: !currentValue,
        updatedAt: serverTimestamp(),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, done: !currentValue } : item
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to update item.");
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this leave upload?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "leaveUploads", id));
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete item.");
    }
  }

  return (
    <AdminGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <a href="/admin" style={styles.backButton}>
            ← Back to Admin Dashboard
          </a>

          <h1 style={styles.title}>Recent Leave Uploads</h1>
          <p style={styles.subtitle}>Review submitted leave-related files.</p>

          {loading ? <p>Loading...</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          {!loading && !error && items.length === 0 ? (
            <p style={styles.emptyText}>No leave uploads found.</p>
          ) : null}

          <div style={styles.list}>
            {items.map((leave) => (
              <div key={leave.id} style={styles.item}>
                <div style={{ flex: 1 }}>
                  <p style={styles.meta}>
                    <strong>Type:</strong> {leave.type.replaceAll("_", " ")}
                  </p>
                  <p style={styles.meta}>
                    <strong>File:</strong> {leave.fileName}
                  </p>
                  <p style={styles.meta}>
                    <strong>Employee:</strong>{" "}
                    {leave.employeeName || "Unknown employee"}
                  </p>
                  <p style={styles.meta}>
                    <strong>Email:</strong>{" "}
                    {leave.employeeEmail || "No email"}
                  </p>
                  <p style={styles.meta}>
                    <strong>Status:</strong> {leave.done ? "✅ Done" : "Pending"}
                  </p>
                </div>

                <div style={styles.actions}>
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
                    style={styles.primaryButton}
                  >
                    View File
                  </a>

                  <button
                    type="button"
                    style={leave.done ? styles.doneButtonActive : styles.doneButton}
                    onClick={() => toggleDone(leave.id, leave.done)}
                  >
                    ✅
                  </button>

                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => handleDelete(leave.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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
    maxWidth: "1100px",
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
    textAlign: "center",
    marginBottom: "12px",
  },
  emptyText: {
    color: "#526071",
    textAlign: "center",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  item: {
    border: "1px solid #dce3ee",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  meta: {
    margin: "6px 0",
    color: "#334155",
    fontSize: "16px",
    textTransform: "capitalize",
  },
  actions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#163b73",
    color: "#ffffff",
    textDecoration: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#e8eef8",
    color: "#163b73",
    textDecoration: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "1px solid #c9d6ea",
    cursor: "pointer",
  },
  doneButton: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "18px",
  },
  doneButtonActive: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "18px",
  },
  deleteButton: {
    background: "#d32f2f",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
};