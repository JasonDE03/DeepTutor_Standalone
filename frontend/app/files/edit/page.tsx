'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, ArrowLeft, AlertCircle, CheckCircle, GitCompare, Lock, LockOpen } from 'lucide-react';
import CoWriterEditor from '@/components/CoWriterEditor';
import DiffViewerModal from '@/components/DiffViewerModal';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';

export default function FileEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  
  const bucket = searchParams.get('bucket') || 'wonderpedia';
  const path = searchParams.get('path') || '';
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // JSON handling
  const [originalJson, setOriginalJson] = useState<any>(null);
  const [jsonKey, setJsonKey] = useState<string>('');
  
  // Diff viewer
  const [showDiff, setShowDiff] = useState(false);

  // Locking
  const [isLocked, setIsLocked] = useState(false);
  const [lockOwner, setLockOwner] = useState<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (path && user && token) {
      loadFile();
      acquireLock();
    }
    
    return () => {
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
        }
        if (path && token) {
             releaseLock();
        }
    };
  }, [path, bucket, user, token]);

  // Handle content changes from CoWriterEditor
  const handleContentChange = (newContent: string) => {
    // Prevent edits if locked by someone else
    if (lockOwner && lockOwner !== user?.username) return;
    
    setContent(newContent);
    setIsDirty(newContent !== originalContent);
  };

  const loadFile = async () => {
    setLoading(true);
    setError('');
    try {
      // Use encodeURI to handle spaces and special chars, but preserve slashes
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load file: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      let fileContent = data.content || '';

      // JSON Handling logic
      if (path.toLowerCase().endsWith('.json')) {
        try {
            const jsonObj = JSON.parse(fileContent);
            setOriginalJson(jsonObj);
            
            // Heuristic to find the markdown content field
            // Priority: content > markdown > body > text > description > long string field
            const candidates = ['content', 'markdown', 'body', 'text', 'description'];
            let foundKey = '';
            
            for (const key of candidates) {
                if (jsonObj[key] && typeof jsonObj[key] === 'string') {
                    foundKey = key;
                    break;
                }
            }
            
            // Fallback: find first long string field (> 50 chars)
            if (!foundKey) {
                for (const [key, val] of Object.entries(jsonObj)) {
                    if (typeof val === 'string' && val.length > 50) {
                        foundKey = key;
                        break;
                    }
                }
            }
            
            if (foundKey) {
                setJsonKey(foundKey);
                fileContent = jsonObj[foundKey];
                console.log(`Detected JSON field for editing: ${foundKey}`);
            } else {
                console.warn("No suitable Markdown field found in JSON, editing purely as text.");
                // If no suitable field found, treat as plain text (show raw JSON)
                setOriginalJson(null);
            }
            
        } catch (e) {
            console.error("Failed to parse JSON, treating as text", e);
            // Treat as text if parse fails
        }
      } else {
          setOriginalJson(null);
          setJsonKey('');
      }
      
      setContent(fileContent);
      setOriginalContent(fileContent);
      setIsDirty(false); // Reset dirty state initially
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      let contentToSave = content;
      
      // If editing JSON field, inject back into object
      if (originalJson && jsonKey) {
          const updatedJson = { ...originalJson, [jsonKey]: content };
          contentToSave = JSON.stringify(updatedJson, null, 2); // Pretty print
      }

      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentToSave }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to save file: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Update original content to current content to reset dirty state
      if (originalJson) {
           // We keep the JSON object updated effectively
           setOriginalJson({ ...originalJson, [jsonKey]: content });
      }
      setOriginalContent(content);
      setIsDirty(false);
      setSuccess(`File saved successfully (${data.size} bytes)`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const acquireLock = async () => {
    if (!path || !user) return;
    
    try {
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}/lock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 409) {
          const data = await res.json();
          setLockOwner(data.detail?.split(':')?.[1]?.trim() || 'unknown');
          setIsLocked(true);
          setError(`File is locked by another user`);
      } else if (res.ok) {
          setIsLocked(false);
          setLockOwner(user.username);
          // Start heartbeat
          if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = setInterval(sendHeartbeat, 30000); // 30s
      }
    } catch (e) {
        console.error("Failed to acquire lock", e);
    }
  };

  const releaseLock = async () => {
    if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
    }
    if (!path || !user) return;
    
    try {
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}/lock`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
        console.error("Failed to release lock", e);
    }
  };

  const sendHeartbeat = async () => {
    if (!path || !user) return;
    try {
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}/lock/heartbeat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
           // Lost lock?
           console.warn("Heartbeat failed, potentially lost lock");
      }
    } catch (e) {
        console.error("Heartbeat error", e);
    }
  };

  // Add global key listener for save (since editor captures focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !saving) {
          saveFile();
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isDirty, saving, content, originalJson]); 

  // Handle unsaved changes warning (Tab Close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/files')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Files</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="text-sm">
              <div className="text-gray-500">
                  Editing
                  {jsonKey && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">JSON: {jsonKey}</span>}
              </div>
              <div className="font-medium text-gray-900 truncate max-w-md" title={`${bucket}/${path}`}>
                📄 {bucket}/{path}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-sm text-amber-600 font-medium animate-pulse">
                • Unsaved changes
              </span>
            )}
            
            <button
              onClick={() => setShowDiff(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <GitCompare className="w-4 h-4" />
              Compare Versions
            </button>
            
            <button
              onClick={saveFile}
              disabled={saving || !isDirty}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                saving || !isDirty
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Editor - allow it to fill remaining space */}
      <div className="flex-1 min-h-0 relative">
        <CoWriterEditor 
          initialValue={originalContent} 
          onChange={handleContentChange}
        />
      </div>
      
      {/* Diff Viewer Modal */}
      <DiffViewerModal
        bucket={bucket}
        path={path}
        currentContent={content}
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
        token={token}
      />
    </div>
  );
}
