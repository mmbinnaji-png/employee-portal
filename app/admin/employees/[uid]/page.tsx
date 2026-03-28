"use client";
import AdminGuard from "@/components/AdminGuard";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type EmployeeProfile = {
  uid?: string;
  fullName: string;
  employeeId: string;
  department: string;
  email: string;
  role: string;
};

type FileItem = {
  id: string;
  type?: string;
  month?: string;
  year?: string;
  fileName: string;
  fileUrl: string;
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const uid = params.uid as string;

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [leaves, setLeaves] = useState<FileItem[]>([]);
  const [payslips, setPayslips] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("Employee not found.");
          setLoading(false);
          return;
        }

        setEmployee(userSnap.data() as EmployeeProfile);

        const documentsSnap = await getDocs(
          query(collection(db, "users", uid, "documents"), orderBy("uploadedAt", "desc"))
        );
        const leavesSnap = await getDocs(
          query(collection(db, "users", uid, "leaves"), orderBy("uploadedAt", "desc"))
        );
        const payslipsSnap = await getDocs(
          query(collection(db, "users", uid, "payslips"), orderBy("uploadedAt", "desc"))
        );

        setDocuments(
          documentsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<FileItem, "id">),
          }))
        );

        setLeaves(
          leavesSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<FileItem, "id">),
          }))
        );

        setPayslips(
          payslipsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<FileItem, "id">),
          }))
        );
      } catch (err: any) {
        setError(err.message || "Failed to load employee profile.");
      } finally {
        setLoading(false);
      }
    }

    if (uid) {
      loadProfile();
    }
  }, [uid]);

  if (loading) {
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

  if (error) {
    return (
        <AdminGuard>
      <main style={styles.page}>
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
          <a href="/admin/employees" style={styles.backButton}>
            Back to Employees
          </a>
        </div>
      </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Employee Profile</h1>

        {employee ? (
          <div style={styles.profileBox}>
            <p style={styles.name}>{employee.fullName}</p>
            <p style={styles.meta}>Employee ID: {employee.employeeId}</p>
            <p style={styles.meta}>Department: {employee.department}</p>
            <p style={styles.meta}>Email: {employee.email}</p>
            <p style={styles.meta}>Role: {employee.role}</p>
          </div>
        ) : null}

        <Section
          title="Documents"
          items={documents}
          emptyText="No documents uploaded."
          typeMode="type"
        />

        <Section
          title="Leaves"
          items={leaves}
          emptyText="No leave files uploaded."
          typeMode="type"
        />

        <Section
          title="Payslips"
          items={payslips}
          emptyText="No payslips uploaded."
          typeMode="payslip"
        />

        <a href="/admin/employees" style={styles.backButton}>
          Back to Employees
        </a>
      </div>
    </main>
    </AdminGuard>
  );
}

function Section({
  title,
  items,
  emptyText,
  typeMode,
}: {
  title: string;
  items: FileItem[];
  emptyText: string;
  typeMode: "type" | "payslip";
}) {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>

      {items.length === 0 ? (
        <p style={styles.emptyText}>{emptyText}</p>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.item}>
              <div>
                <p style={styles.fileName}>{item.fileName}</p>
                {typeMode === "type" ? (
                  <p style={styles.meta}>
                    Type: {item.type?.replaceAll("_", " ")}
                  </p>
                ) : (
                  <p style={styles.meta}>
                    {item.month}/{item.year}
                  </p>
                )}
              </div>

              <a
                href={item.fileUrl}
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
    marginBottom: "20px",
  },
  profileBox: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
  },
  name: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
  },
  meta: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    color: "#526071",
  },
  section: {
    marginTop: "28px",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  emptyText: {
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
    marginTop: "28px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
  error: {
    color: "#c62828",
    textAlign: "center",
  },
};