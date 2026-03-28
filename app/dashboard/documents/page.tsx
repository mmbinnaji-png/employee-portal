"use client";
import EmployeeGuard from "@/components/EmployeeGuard";
import { ChangeEvent, useEffect, useState } from "react";
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
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type UploadedDocument = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: any;
};

const documentTypes = [
  { label: "Passport", value: "passport" },
  { label: "Residency", value: "residency" },
  { label: "Civil ID", value: "civil_id" },
  { label: "Driver License", value: "driver_license" },
  { label: "Job Contract", value: "job_contract" },
];

export default function DocumentsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [uploadingType, setUploadingType] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);
      await loadDocuments(user.uid);
      setLoadingPage(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function loadDocuments(uid: string) {
    try {
      const docsRef = collection(db, "users", uid, "documents");
      const q = query(docsRef, orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);

      const items: UploadedDocument[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UploadedDocument, "id">),
      }));

      setDocuments(items);
    } catch (err: any) {
      setError(err.message || "Failed to load documents.");
    }
  }

  async function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>,
    type: string
  ) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setError("");
    setSuccess("");
    setUploadingType(type);

    try {
      const safeFileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(
        storage,
        `employee-files/${userId}/documents/${type}/${safeFileName}`
      );

      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "users", userId, "documents"), {
        type,
        fileName: file.name,
        fileUrl,
        uploadedAt: serverTimestamp(),
      });

      await loadDocuments(userId);
      setSuccess(`${type.replace("_", " ")} uploaded successfully.`);
      e.target.value = "";
    } catch (err: any) {
      setError(err.message || "Upload failed.");
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
        <h1 style={styles.title}>My Documents</h1>
        <p style={styles.subtitle}>Upload your required work documents.</p>

        {error ? <p style={styles.error}>{error}</p> : null}
        {success ? <p style={styles.success}>{success}</p> : null}

        <div style={styles.uploadList}>
          {documentTypes.map((docType) => (
            <div key={docType.value} style={styles.uploadCard}>
              <div>
                <h3 style={styles.uploadTitle}>{docType.label}</h3>
                <p style={styles.uploadText}>Choose a file to upload.</p>
              </div>

              <label style={styles.uploadButton}>
                {uploadingType === docType.value ? "Uploading..." : "Upload File"}
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileUpload(e, docType.value)}
                  disabled={uploadingType === docType.value}
                />
              </label>
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Uploaded Documents</h2>

          {documents.length === 0 ? (
            <p style={styles.emptyText}>No documents uploaded yet.</p>
          ) : (
            <div style={styles.documentList}>
              {documents.map((doc) => (
                <div key={doc.id} style={styles.documentItem}>
                  <div>
                    <p style={styles.docName}>{doc.fileName}</p>
                    <p style={styles.docMeta}>
                      Type: {doc.type.replaceAll("_", " ")}
                    </p>
                  </div>

                  <a
                    href={doc.fileUrl}
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
  uploadList: {
    display: "grid",
    gap: "14px",
    marginBottom: "28px",
  },
  uploadCard: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  uploadTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  uploadText: {
    margin: "6px 0 0 0",
    color: "#526071",
    fontSize: "14px",
  },
  uploadButton: {
    background: "#163b73",
    color: "#ffffff",
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
  },
  emptyText: {
    color: "#526071",
  },
  documentList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  documentItem: {
    border: "1px solid #dce3ee",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  docName: {
    margin: 0,
    fontWeight: 600,
  },
  docMeta: {
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
  backButton: {
    display: "inline-block",
    marginTop: "24px",
    textDecoration: "none",
    color: "#163b73",
    fontWeight: 600,
  },
};