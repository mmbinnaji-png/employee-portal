"use client";
import AdminGuard from "@/components/AdminGuard";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

type Employee = {
  id: string;
  fullName: string;
  employeeId: string;
  department: string;
  email: string;
  role: string;
};

export default function AdminPayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadEmployees() {
      try {
        const snapshot = await getDocs(collection(db, "users"));

        const items: Employee[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Employee, "id">),
        }));

        setEmployees(items.filter((item) => item.role === "employee"));
      } catch (err: any) {
        setError(err.message || "Failed to load employees.");
      } finally {
        setLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!month) {
      setError("Please enter the month.");
      return;
    }

    if (!year) {
      setError("Please enter the year.");
      return;
    }

    if (!file) {
      setError("Please choose a payslip file.");
      return;
    }

    setSubmitting(true);

    try {
      const safeFileName = `${year}-${month}-${Date.now()}-${file.name}`;
      const storageRef = ref(
        storage,
        `employee-files/${selectedEmployeeId}/payslips/${safeFileName}`
      );

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "users", selectedEmployeeId, "payslips"), {
        month,
        year,
        fileName: file.name,
        fileUrl,
        uploadedAt: serverTimestamp(),
      });

      setSuccess("Payslip uploaded successfully.");
      setSelectedEmployeeId("");
      setMonth("");
      setYear("");
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload payslip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminGuard>
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Upload Payslips</h1>
        <p style={styles.subtitle}>Upload a payslip PDF for an employee.</p>

        {loadingEmployees ? <p style={styles.info}>Loading employees...</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}
        {success ? <p style={styles.success}>{success}</p> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={styles.input}
              disabled={submitting}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.employeeId}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Month</label>
              <input
                type="text"
                placeholder="03"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={styles.input}
                disabled={submitting}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Year</label>
              <input
                type="text"
                placeholder="2026"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={styles.input}
                disabled={submitting}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Payslip File</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Uploading..." : "Upload Payslip"}
          </button>
        </form>

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
    maxWidth: "760px",
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
    color: "#526071",
    marginBottom: "24px",
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
  success: {
    textAlign: "center",
    color: "#2e7d32",
    marginBottom: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  label: {
    fontWeight: 600,
    fontSize: "14px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d7e2",
    fontSize: "15px",
  },
  button: {
    marginTop: "8px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#163b73",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  backButton: {
    display: "inline-block",
    marginTop: "24px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
};