'use client';

import { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Clock, X, GitBranch } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';

interface FileVersion {
  version_id: string;
  last_modified: string;
  size: number;
  is_latest: boolean;
  is_delete_marker: boolean;
}

interface DiffViewerModalProps {
  bucket: string;
  path: string;
  currentContent: string;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

export default function DiffViewerModal({ bucket, path, currentContent, isOpen, onClose, token }: DiffViewerModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [versionContent, setVersionContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, bucket, path]);

  const fetchVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}/versions`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch versions');
      const data = await res.json();
      
      const validVersions = data.versions
        .filter((v: FileVersion) => !v.is_delete_marker)
        .sort((a: FileVersion, b: FileVersion) => 
          new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
        );
      
      setVersions(validVersions);
      
      if (validVersions.length > 1) {
        const previousVersion = validVersions[1];
        setSelectedVersion(previousVersion.version_id);
        await fetchVersionContent(previousVersion.version_id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionContent = async (versionId: string) => {
    setLoading(true);
    try {
      const safePath = path.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`${API_BASE}/api/v1/files/${bucket}/${safePath}/versions/${versionId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch version content');
      const data = await res.json();
      setVersionContent(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = async (versionId: string) => {
    setSelectedVersion(versionId);
    await fetchVersionContent(versionId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Version Comparison</h2>
              <p className="text-sm text-gray-500">{path}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Version Selector */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Compare with:
            </label>
            <select
              value={selectedVersion}
              onChange={(e) => handleVersionChange(e.target.value)}
              disabled={loading || versions.length === 0}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a version...</option>
              {versions.map((v, idx) => (
                <option key={v.version_id} value={v.version_id}>
                  {v.is_latest ? '🟢 ' : ''}
                  Version {versions.length - idx} - {formatDate(v.last_modified)} ({formatSize(v.size)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && !error && selectedVersion && (
            <ReactDiffViewer
              oldValue={versionContent}
              newValue={currentContent}
              splitView={true}
              leftTitle={`Version ${versions.findIndex(v => v.version_id === selectedVersion) + 1} (${formatDate(versions.find(v => v.version_id === selectedVersion)?.last_modified || '')})`}
              rightTitle="Current Version"
              showDiffOnly={false}
              styles={{
                variables: {
                  light: {
                    diffViewerBackground: '#fff',
                    diffViewerColor: '#212529',
                    addedBackground: '#e6ffed',
                    addedColor: '#24292e',
                    removedBackground: '#ffeef0',
                    removedColor: '#24292e',
                    wordAddedBackground: '#acf2bd',
                    wordRemovedBackground: '#fdb8c0',
                    addedGutterBackground: '#cdffd8',
                    removedGutterBackground: '#ffdce0',
                    gutterBackground: '#f6f8fa',
                    gutterBackgroundDark: '#e9ecef',
                    highlightBackground: '#fffbdd',
                    highlightGutterBackground: '#fff5b1',
                  },
                },
              }}
            />
          )}

          {!loading && !error && !selectedVersion && versions.length > 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Please select a version to compare</p>
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No previous versions available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
