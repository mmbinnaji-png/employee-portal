"use client";

import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
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
import { auth, db } from "@/lib/firebase";

type NotificationItem = {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  employeeUid?: string;
  employeeName?: string;
  employeeEmail?: string;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
  createdAt?: any;
  forAdmins?: boolean;
  done?: boolean;
  doneAt?: any;
};

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [loadingPage, setLoadingPage] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      await loadNotifications();
      setLoadingPage(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function loadNotifications() {
    try {
      setError("");

      const notificationsRef = collection(db, "notifications");
      const q = query(notificationsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const items: NotificationItem[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<NotificationItem, "id">),
      }));

      setNotifications(items);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications.");
    }
  }

  async function markDone(notificationId: string, currentDone?: boolean) {
    try {
      setWorkingId(notificationId);

      await updateDoc(doc(db, "notifications", notificationId), {
        done: !currentDone,
        doneAt: !currentDone ? serverTimestamp() : null,
      });

      await loadNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to update notification.");
    } finally {
      setWorkingId("");
    }
  }

  async function deleteNotification(notificationId: string) {
    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;

    try {
      setWorkingId(notificationId);

      await deleteDoc(doc(db, "notifications", notificationId));
      await loadNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to delete notification.");
    } finally {
      setWorkingId("");
    }
  }

  if (loadingPage) {
    return (
      <AdminGuard>
        <main style={styles.page}>
          <div style={styles.card}>
            <p>Loading...</p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <a href="/admin" style={styles.backButton}>
            ← Back to Admin Dashboard
          </a>

          <h1 style={styles.title}>Admin Notifications</h1>
          <p style={styles.subtitle}>
            Review uploaded files and employee requests.
          </p>

          {error ? <p style={styles.error}>{error}</p> : null}

          {notifications.length === 0 ? (
            <p style={styles.emptyText}>No notifications found.</p>
          ) : (
            <div style={styles.list}>
              {notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...styles.item,
                    opacity: item.done ? 0.75 : 1,
                  }}
                >
                  <div style={styles.itemTop}>
                    <div>
                      <p style={styles.itemTitle}>
                        {item.title || "Notification"}
                      </p>

                      <p style={styles.meta}>
                        {item.message || "No message"}
                      </p>

                      <p style={styles.meta}>
                        Employee: {item.employeeName || "Unknown employee"}
                      </p>

                      {item.employeeEmail ? (
                        <p style={styles.meta}>Email: {item.employeeEmail}</p>
                      ) : null}

                      {item.fileName ? (
                        <p style={styles.meta}>File: {item.fileName}</p>
                      ) : null}

                      {item.documentType ? (
                        <p style={styles.meta}>
                          Type: {item.documentType.replaceAll("_", " ")}
                        </p>
                      ) : null}

                      <p
                        style={{
                          ...styles.status,
                          color: item.done ? "#15803d" : "#b45309",
                        }}
                      >
                        {item.done ? "✅ Done" : "Pending"}
                      </p>
                    </div>
                  </div>

                  <div style={styles.actions}>
                    {item.employeeUid ? (
                      <a
                        href={`/admin/employees/${item.employeeUid}`}
                        style={styles.secondaryButton}
                      >
                        View Employee
                      </a>
                    ) : null}

                    {item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.primaryButton}
                      >
                        View File
                      </a>
                    ) : null}

                    <button
                      onClick={() => markDone(item.id, item.done)}
                      style={styles.doneButton}
                      disabled={workingId === item.id}
                    >
                      {workingId === item.id
                        ? "Saving..."
                        : item.done
                        ? "↩ Undo"
                        : "✅ Done"}
                    </button>

                    <button
                      onClick={() => deleteNotification(item.id)}
                      style={styles.deleteButton}
                      disabled={workingId === item.id}
                    >
                      {workingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  backButton: {
    display: "inline-block",
    marginBottom: "16px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
  title: {
    fontSize: "36px",
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
    textAlign: "center",
    color: "#526071",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  item: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    background: "#ffffff",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },
  itemTitle: {
    margin: 0,
    marginBottom: "8px",
    fontWeight: 700,
    fontSize: "18px",
    color: "#0f172a",
  },
  meta: {
    margin: "6px 0",
    color: "#526071",
    fontSize: "14px",
  },
  status: {
    marginTop: "10px",
    fontWeight: 700,
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "16px",
  },
  primaryButton: {
    textDecoration: "none",
    background: "#163b73",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "none",
    display: "inline-block",
  },
  secondaryButton: {
    textDecoration: "none",
    background: "#e9eef6",
    color: "#163b73",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "1px solid #dce3ee",
    display: "inline-block",
  },
  doneButton: {
    background: "#15803d",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#c62828",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
};