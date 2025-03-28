'use client';

import { useState, FormEvent } from 'react';
import { FaGithub, FaDiscord } from 'react-icons/fa';

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
      const response = await fetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({ title, description, hasFile: !!file }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Submission failed');
      }

      // If response is OK and file exists, upload file separately
      if (file) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        
        await fetch('/api/report/upload', {
          method: 'POST',
          body: fileFormData
        });
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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md relative">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report Title"
            required
            className="w-full p-2 bg-gray-700 text-white rounded"
            disabled={isSubmitting}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your report"
            required
            className="w-full p-2 bg-gray-700 text-white rounded h-32"
            disabled={isSubmitting}
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-white"
            accept="image/*,application/pdf"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className={`w-full p-2 rounded transition ${
              isSubmitting 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
          {status && (
            <p className={`text-center ${
              status.includes('successfully') 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {status}
            </p>
          )}
        </form>

        <div className="absolute bottom-4 left-4 flex space-x-4">
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white text-2xl hover:text-gray-300"
          >
            <FaGithub />
          </a>
          <a 
            href="https://discord.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white text-2xl hover:text-gray-300"
          >
            <FaDiscord />
          </a>
        </div>
      </div>
    </div>
  );
}