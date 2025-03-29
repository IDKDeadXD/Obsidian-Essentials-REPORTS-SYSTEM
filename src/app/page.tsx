'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

// Define a custom error type
interface ReportError {
  message?: string;
}

// Define announcement type
interface Announcement {
  id: string;
  title: string;
  content: string;
  version: number;
}

export default function ReportForm() {
  // Current announcement configuration
  const CURRENT_ANNOUNCEMENT: Announcement = {
    id: 'release-2.0',
    title: '2.0 Release',
    content: 'We are currently focused on developing version 2.0 of the add-on. If you are experiencing missing features or functionality issues, please note that we are already aware of these limitations. Our development efforts are prioritized on completing and launching the 2.0 release as soon as possible.',
    version: 1 // Increment this when you want to show a new announcement
  };
  
  // Toggle to enable/disable announcements
  const SHOW_ANNOUNCEMENT = true;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  // Correct way to create a ref using useRef
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if the user has already seen the current version of the announcement
  useEffect(() => {
    // Only run client-side
    if (typeof window !== 'undefined') {
      const lastSeenVersion = localStorage.getItem('announcementVersion');
      
      // If announcement is enabled and user hasn't seen this version yet
      if (SHOW_ANNOUNCEMENT && (!lastSeenVersion || parseInt(lastSeenVersion) < CURRENT_ANNOUNCEMENT.version)) {
        setShowAnnouncement(true);
        setCurrentAnnouncement(CURRENT_ANNOUNCEMENT);
      }
    }
  }, [CURRENT_ANNOUNCEMENT, SHOW_ANNOUNCEMENT]); // Added the missing dependencies

  // Mark announcement as seen with the current version
  const closeAnnouncement = () => {
    setShowAnnouncement(false);
    localStorage.setItem('announcementVersion', CURRENT_ANNOUNCEMENT.version.toString());
  };

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
        const errorData: ReportError = await textResponse.json();
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
          const errorData: ReportError = await fileResponse.json();
          throw new Error(errorData.message || 'File upload failed');
        }
      }

      setStatus('Report submitted successfully!');
      
      // Clear all fields, including the file input
      setTitle('');
      setDescription('');
      setFile(null);
      setAcknowledgedWarning(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Type guard to handle error
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      setStatus(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      {/* Announcement Modal */}
      {showAnnouncement && currentAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-white p-8 rounded-lg shadow-xl w-full max-w-md relative animate-fadeIn">
            <button
              onClick={closeAnnouncement}
              className="absolute top-2 right-2 text-white hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="text-white">
              <h2 className="text-xl font-bold mb-2">{currentAnnouncement.title}</h2>
              <hr className="border-white mb-4" />
              <p className="mb-4">
                {currentAnnouncement.content}
              </p>
              <button
                onClick={closeAnnouncement}
                className="w-full p-2 bg-black text-white border border-white rounded hover:bg-gray-900 transition mt-2"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-black border-2 border-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report Title"
            required
            className="w-full p-2 bg-black text-white border border-white rounded placeholder-gray-500"
            disabled={isSubmitting}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your report"
            required
            className="w-full p-2 bg-black text-white border border-white rounded h-32 placeholder-gray-500"
            disabled={isSubmitting}
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-white border border-white rounded"
            accept="image/*,application/pdf"
            disabled={isSubmitting}
            ref={fileInputRef}
          />
          
          {/* IP Blacklisting Warning */}
          <div className="p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-md">
            <p className="text-red-400 text-sm mb-2">
              <strong>⚠️ Warning:</strong> Misuse or abuse of this reporting system (including spam, false reports, or malicious content) will result in your IP address being permanently blacklisted from our services.
            </p>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={acknowledgedWarning}
                onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                className="border border-white rounded"
                required
              />
              <span className="text-white text-sm">I understand and will use the system responsibly</span>
            </label>
          </div>
          
          <button
            type="submit"
            className={`w-full p-2 rounded transition border border-white ${
              isSubmitting || !acknowledgedWarning
                ? 'bg-gray-900 text-gray-500 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-900'
            }`}
            disabled={isSubmitting || !acknowledgedWarning}
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
      </div>
      
      {/* Social Icons */}
      <div className="absolute bottom-4 left-4 flex space-x-4">
        <a 
          href="https://github.com/IDKDeadXD/Obsidian-Essentials-REPORTS-SYSTEM" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white hover:text-gray-300 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a 
          href="https://discord.gg/CDbtnyJMUY" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white hover:text-gray-300 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.54 0c1.356 0 2.46 1.104 2.46 2.472v21.528l-2.58-2.28-1.452-1.344-1.536-1.428.636 2.22h-13.608c-1.356 0-2.46-1.104-2.46-2.472v-16.224c0-1.368 1.104-2.472 2.46-2.472h16.08zm-4.632 15.672c2.652-.084 3.672-1.824 3.672-1.824 0-3.864-1.728-6.996-1.728-6.996-1.728-1.296-3.372-1.26-3.372-1.26l-.168.192c2.04.624 2.988 1.524 2.988 1.524-1.248-.684-2.472-1.02-3.612-1.152-.864-.096-1.692.012-2.424.048l-.204.024c-.42.036-1.44.192-2.724.756-.444.204-.708.348-.708.348s.996-.948 3.156-1.572l-.12-.144s-1.644-.036-3.372 1.26c0 0-1.728 3.132-1.728 6.996 0 0 1.008 1.74 3.66 1.824 0 0 .444-.54.804-.996-1.524-.456-2.1-1.416-2.1-1.416l.336.204.48.294.012.012.012.006.048.036.168.096.012.006c.12.072.24.132.348.192.192.096.384.192.576.276.312.156.684.3 1.104.408.564.12 1.227.168 1.953.012.36-.072.732-.18 1.116-.348.264-.096.56-.24.876-.42 0 0-.6.984-2.172 1.428.36.456.792.984.792.984z"/>
          </svg>
        </a>
      </div>
    </div>
  );
}