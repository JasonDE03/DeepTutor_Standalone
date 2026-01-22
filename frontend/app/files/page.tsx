'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Folder, Calendar, HardDrive } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';

interface FileMetadata {
  name: string;
  size: number;
  last_modified: string;
  content_type: string;
  is_dir?: boolean;
}

export default function FileBrowserPage() {
  const router = useRouter();
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load buckets on mount
  useEffect(() => {
    fetchBuckets();
  }, []);

  // Load files when bucket or path changes
  useEffect(() => {
    if (selectedBucket) {
      fetchFiles();
    }
  }, [selectedBucket, currentPath]);

  const fetchBuckets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/files/buckets`);
      if (!res.ok) throw new Error('Failed to fetch buckets');
      const data = await res.json();
      const bucketList = data.buckets || [];
      setBuckets(bucketList);
      
      // Auto-select first bucket if current selection is invalid or empty
      if (bucketList.length > 0 && (!selectedBucket || !bucketList.includes(selectedBucket))) {
        setSelectedBucket(bucketList[0]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        prefix: currentPath,
        recursive: 'false',
        search: searchQuery,
        extensions: '.md,.markdown,.txt,.json'
      });
      
      const res = await fetch(`${API_BASE}/api/v1/files/${selectedBucket}?${params}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      
      const data = await res.json();
      
      // Sort: folders first, then files
      const sortedFiles = (data.files || []).sort((a: FileMetadata, b: FileMetadata) => {
        if (a.is_dir === b.is_dir) {
            return a.name.localeCompare(b.name);
        }
        return a.is_dir ? -1 : 1;
      });
      
      setFiles(sortedFiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFileClick = (file: FileMetadata) => {
    if (file.is_dir) {
        setCurrentPath(file.name); // Directory name usually includes trailing slash or full prefix
    } else {
        // Navigate to editor with bucket and file path
        const encodedPath = encodeURIComponent(file.name);
        router.push(`/files/edit?bucket=${selectedBucket}&path=${encodedPath}`);
    }
  };
  
  const navigateUp = () => {
      if (!currentPath) return;
      // Remove trailing slash if present
      const path = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
      const parts = path.split('/');
      parts.pop();
      const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
      setCurrentPath(newPath);
  };
  
  const navigateToRoot = () => setCurrentPath('');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format display name (remove prefix)
  const getDisplayName = (name: string) => {
      // If inside a folder, removing the currentPath prefix
      if (currentPath && name.startsWith(currentPath)) {
          return name.slice(currentPath.length);
      }
      return name;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📁 File Browser</h1>
          <p className="text-gray-600">Browse and edit markdown files from MinIO storage</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            {/* Bucket Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HardDrive className="inline w-4 h-4 mr-1" />
                Bucket
              </label>
              <select
                value={selectedBucket}
                onChange={(e) => {
                    setSelectedBucket(e.target.value);
                    setCurrentPath(''); // Reset path on bucket change
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>{bucket}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline w-4 h-4 mr-1" />
                Search Files
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                  placeholder="Type filename and press Enter..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={fetchFiles}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="bg-white rounded-t-lg border-b border-gray-200 px-6 py-3 flex items-center gap-2 text-sm">
            <button 
                onClick={navigateToRoot}
                className={`hover:text-blue-500 ${!currentPath ? 'font-bold text-gray-900' : 'text-gray-500'}`}
            >
                {selectedBucket || 'Bucket'}
            </button>
            {currentPath.split('/').filter(Boolean).map((part, index, arr) => {
                const isLast = index === arr.length - 1;
                // reconstruct path for this part
                const path = arr.slice(0, index + 1).join('/') + '/';
                return (
                    <div key={path} className="flex items-center gap-2">
                        <span className="text-gray-400">/</span>
                        <button
                            onClick={() => setCurrentPath(path)}
                            disabled={isLast}
                            className={`${isLast ? 'font-bold text-gray-900 cursor-default' : 'text-gray-500 hover:text-blue-500'}`}
                        >
                            {part}
                        </button>
                    </div>
                );
            })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* File List */}
        <div className="bg-white rounded-b-lg shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              Loading files...
            </div>
          ) : files.length === 0 && !currentPath ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No files found in <strong>{selectedBucket}</strong></p>
              {searchQuery && <p className="text-sm mt-2">Try a different search query</p>}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentPath && (
                    <tr 
                        onClick={navigateUp}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                        <td className="px-6 py-4">
                            <Folder className="w-5 h-5 text-yellow-500" />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                            ..
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">-</td>
                        <td className="px-6 py-4 text-sm text-gray-500">-</td>
                    </tr>
                )}
                
                {files.map((file, idx) => {
                  const isDir = file.is_dir;
                  return (
                  <tr
                    key={idx}
                    onClick={() => handleFileClick(file)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                        {isDir ? (
                            <Folder className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600" />
                        ) : (
                            <FileText className="w-5 h-5 text-blue-500 group-hover:text-blue-600" />
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-medium truncate block max-w-lg">
                        {getDisplayName(file.name)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {isDir ? '-' : formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        {file.last_modified ? (
                            <>
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {formatDate(file.last_modified)}
                            </>
                        ) : '-'}
                      </div>
                    </td>
                  </tr>
                )})}
                
                {files.length === 0 && currentPath && (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                            Empty folder
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Stats */}
        {files.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {files.length} item{files.length !== 1 ? 's' : ''} in <strong>{currentPath ? currentPath : selectedBucket}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
