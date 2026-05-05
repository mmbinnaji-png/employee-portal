"use client";

import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  employeeUid?: string;
  employeeName?: string;
  fileName?: string;
  documentType?: string;
  leaveType?: string;
  requestType?: string;
  month?: string;
  year?: string;
  createdAt?: any;
  forAdmins?: boolean;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<NotificationItem, "id">),
        }))
        .filter((item) => item.forAdmins === true);

      setNotifications(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AdminGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <a href="/admin" style={styles.backButton}>
            Back to Admin Dashboard
          </a>

          <h1 style={styles.title}>Notifications</h1>
          <p style={styles.subtitle}>Admin-only notifications</p>

          {loading ? (
            <p style={styles.emptyText}>Loading...</p>
          ) : notifications.length === 0 ? (
            <p style={styles.emptyText}>No notifications yet.</p>
          ) : (
            <div style={styles.list}>
              {notifications.map((item) => (
                <div key={item.id} style={styles.item}>
                  <h3 style={styles.itemTitle}>{item.title}</h3>
                  <p style={styles.itemText}>{item.message}</p>

                  {item.employeeName ? (
                    <p style={styles.meta}>Employee: {item.employeeName}</p>
                  ) : null}

                  {item.fileName ? (
                    <p style={styles.meta}>File: {item.fileName}</p>
                  ) : null}

                  {item.month && item.year ? (
                    <p style={styles.meta}>
                      Requested month: {item.month} {item.year}
                    </p>
                  ) : null}
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
    fontWeight: 700,
    fontSize: "15px",
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
  itemTitle: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#163b73",
  },
  itemText: {
    margin: 0,
    marginBottom: "8px",
    color: "#334155",
  },
  meta: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  emptyText: {
    textAlign: "center",
    color: "#526071",
  },
};