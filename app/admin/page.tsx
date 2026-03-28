"use client";
import AdminGuard from "@/components/AdminGuard";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <AdminGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.text}>You are logged in as an admin.</p>

        <div style={styles.links}>
          <a href="/admin/employees" style={styles.linkButton}>
            Employees
          </a>
          <a href="/admin/leaves" style={styles.linkButton}>
            Recent Leaves
          </a>
          <a href="/admin/payslips" style={styles.linkButton}>
            Upload Payslips
          </a>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
    </main>
    </AdminGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f7fb",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "500px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  text: {
    fontSize: "15px",
    color: "#526071",
    marginBottom: "20px",
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
  },
  linkButton: {
    display: "block",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#163b73",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 600,
  },
  logoutButton: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#d32f2f",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
};