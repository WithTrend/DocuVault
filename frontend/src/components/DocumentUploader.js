import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./DocumentUploader.css";

const DocumentUploader = () => {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/documents");
      setDocuments(res.data);
    } catch (err) {
      toast.error("Failed to fetch documents");
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (storageType) => {
    if (!file) {
      toast.warn("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);

    try {
      const url =
        storageType === "disk"
          ? "http://localhost:5001/api/documents/upload-disk"
          : "http://localhost:5001/api/documents/upload-db";
      const res = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message);
      fetchDocuments();
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const res = await axios.get(
        `http://localhost:5001/api/documents/download/${id}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloading ${filename}`);
    } catch (err) {
      toast.error("Download failed");
      console.error(err);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const res = await axios.delete(
        `http://localhost:5001/api/documents/${id}`
      );
      toast.success(res.data.message);
      fetchDocuments(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Document Upload System</h1>

      {/* Upload Section */}
      <div className="upload-section">
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="file-label">
          {file ? file.name : "Choose a file"}
        </label>
        <div className="button-group">
          <button
            onClick={() => handleUpload("disk")}
            className="upload-btn disk-btn"
          >
            Upload to Disk
          </button>
          <button
            onClick={() => handleUpload("db")}
            className="upload-btn db-btn"
          >
            Upload to MongoDB
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="document-list">
        <h2 className="subtitle">Uploaded Documents</h2>
        {documents.length === 0 ? (
          <p className="no-docs">No documents uploaded yet.</p>
        ) : (
          <ul>
            {documents.map((doc) => (
              <li key={doc._id} className="document-item">
                <span className="doc-name">{doc.originalName}</span>
                <span className="doc-size">
                  ({(doc.size / 1024).toFixed(2)} KB)
                </span>
                <div className="action-buttons">
                  {doc.data ? (
                    <button
                      onClick={() => handleDownload(doc._id, doc.originalName)}
                      className="download-btn"
                    >
                      Download
                    </button>
                  ) : (
                    <a
                      href={`http://localhost:5001/${doc.path}`}
                      download
                      className="download-link"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc._id, doc.originalName)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default DocumentUploader;
