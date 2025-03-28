'use client';

import { useState, FormEvent, ChangeEvent } from 'react';

export default function ReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setStatus('Submitting report...');

    try {
      // First, submit the text report
      const textResponse = await fetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!textResponse.ok) {
        const errorData = await textResponse.json();
        throw new Error(errorData.message || 'Submission failed');
      }

      // If file exists, upload separately
      if (file) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        
        const fileResponse = await fetch('/api/report', {
          method: 'PUT',
          body: fileFormData
        });

        if (!fileResponse.ok) {
          const errorData = await fileResponse.json();
          throw new Error(errorData.message || 'File upload failed');
        }
      }

      setStatus('Report submitted successfully!');
      setTitle('');
      setDescription('');
      setFile(null);
    } catch (error: any) {
      setStatus(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <div className="mb-4">
        <label htmlFor="title" className="block mb-2">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="description" className="block mb-2">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="file" className="block mb-2">Attachment (optional)</label>
        <input
          type="file"
          id="file"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/gif"
          className="w-full p-2 border rounded"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Report'}
      </button>
      {status && (
        <div className={`mt-4 p-2 rounded ${status.includes('successfully') ? 'bg-green-100' : 'bg-red-100'}`}>
          {status}
        </div>
      )}
    </form>
  );
}