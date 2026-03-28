"use client";
import AdminGuard from "@/components/AdminGuard";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Employee = {
  id: string;
  uid?: string;
  fullName: string;
  employeeId: string;
  department: string;
  email: string;
  role: string;
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmployees() {
      try {
        const snapshot = await getDocs(collection(db, "users"));

        const items: Employee[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Employee, "id">),
        }));

        const employeeOnly = items.filter((item) => item.role === "employee");
        setEmployees(employeeOnly);
      } catch (err: any) {
        setError(err.message || "Failed to load employees.");
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return employees;

    return employees.filter((employee) => {
      return (
        employee.fullName?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.employeeId?.toLowerCase().includes(term) ||
        employee.department?.toLowerCase().includes(term)
      );
    });
  }, [employees, search]);

  return (
    <AdminGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Employees</h1>
        <p style={styles.subtitle}>Search and view employee profiles.</p>

        <input
          type="text"
          placeholder="Search by name, email, employee ID, or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        {loading ? <p style={styles.info}>Loading employees...</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}

        {!loading && !error && filteredEmployees.length === 0 ? (
          <p style={styles.info}>No employees found.</p>
        ) : null}

        <div style={styles.list}>
          {filteredEmployees.map((employee) => (
            <div key={employee.id} style={styles.item}>
              <div>
                <p style={styles.name}>{employee.fullName}</p>
                <p style={styles.meta}>Employee ID: {employee.employeeId}</p>
                <p style={styles.meta}>Department: {employee.department}</p>
                <p style={styles.meta}>{employee.email}</p>
              </div>

              <a
                href={`/admin/employees/${employee.id}`}
                style={styles.viewButton}
              >
                View Profile
              </a>
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
    maxWidth: "950px",
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
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d7e2",
    fontSize: "15px",
    marginBottom: "20px",
  },
  info: {
    textAlign: "center",
    color: "#526071",
    marginBottom: "16px",
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
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  name: {
    margin: 0,
    fontWeight: 700,
    fontSize: "18px",
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