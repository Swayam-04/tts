import React, { useState } from 'react';
import { Modal, Upload, Button, Progress, message } from 'antd';
import { FiUploadCloud, FiFileText } from 'react-icons/fi';

export default function UploadDialog({ visible, onClose, onUploadSuccess }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error("Please select a file to upload.");
      return;
    }

    const file = fileList[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setProgress(10);

    // Simulate progress
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 80 ? prev + 10 : prev));
    }, 300);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);
      setProgress(100);

      const json = await response.json();
      if (response.ok && json.success) {
        message.success(`${file.name} successfully uploaded and indexed!`);
        setFileList([]);
        onUploadSuccess();
        setTimeout(() => onClose(), 600);
      } else {
        message.error(json.error || "Failed to process document.");
      }
    } catch (err) {
      clearInterval(timer);
      console.error(err);
      message.error("Network connection error. Backend might be offline.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      const isAllowedType = ['pdf', 'docx', 'txt'].includes(file.name.split('.').pop().toLowerCase());
      if (!isAllowedType) {
        message.error(`${file.name} is not supported. Use PDF, DOCX, or TXT.`);
        return Upload.LIST_IGNORE;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("File must be smaller than 10MB.");
        return Upload.LIST_IGNORE;
      }

      setFileList([file]);
      return false; // Stop auto-upload
    },
    fileList,
  };

  return (
    <Modal
      open={visible}
      title="Upload Secure Document"
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          {uploading ? 'Processing & Indexing' : 'Upload & Parse'}
        </Button>
      ]}
      styles={{ body: { padding: '20px 0' } }}
    >
      <div style={{ textAlign: 'center' }}>
        <Upload.Dragger {...uploadProps} maxCount={1} showUploadList={true}>
          <p className="ant-upload-drag-icon" style={{ fontSize: '40px', color: '#1e88e5', margin: '10px 0' }}>
            <FiUploadCloud />
          </p>
          <p className="ant-upload-text" style={{ color: '#f0f6fc', fontWeight: 600 }}>
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint" style={{ color: '#8b949e', fontSize: '12px', padding: '0 20px' }}>
            Supported formats: PDF, DOCX, TXT. Max size 10MB.
            <br />
            Documents are chunked and embedded completely locally for secure processing.
          </p>
        </Upload.Dragger>

        {uploading && (
          <div style={{ marginTop: '20px', padding: '0 10px' }}>
            <Progress percent={progress} status="active" strokeColor="#1e88e5" />
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '6px' }}>
              Parsing text, building chunks and local embeddings...
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
