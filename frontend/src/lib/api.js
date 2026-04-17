import axios from 'axios';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

const getAuthHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const documentAPI = {
  upload: (formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({});
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error - please check if the server is running'));
      });
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });
      
      xhr.open('POST', `${API_URL}/documents/upload`);
      xhr.timeout = 120000;
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },
  getAll: async () => {
    const res = await axios.get(`${API_URL}/documents`, { headers: getAuthHeader() });
    return res.data;
  },
  getOne: async (id) => {
    const res = await axios.get(`${API_URL}/documents/${id}`, { headers: getAuthHeader() });
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_URL}/documents/${id}`, { headers: getAuthHeader() });
    return res.data;
  },
  updateAnnotations: async (id, annotations) => {
    const res = await axios.put(`${API_URL}/documents/${id}/annotations`, { annotations }, { headers: getAuthHeader() });
    return res.data;
  },
  getVersions: async (id) => {
    const res = await axios.get(`${API_URL}/documents/${id}/versions`, { headers: getAuthHeader() });
    return res.data;
  },
  restoreVersion: async (id, versionId) => {
    const res = await axios.post(`${API_URL}/documents/${id}/versions/${versionId}/restore`, {}, { headers: getAuthHeader() });
    return res.data;
  },
  rename: async (id, newName) => {
    const res = await axios.put(`${API_URL}/documents/${id}/rename`, { originalName: newName }, { headers: getAuthHeader() });
    return res.data;
  },
  search: async (query) => {
    const res = await axios.get(`${API_URL}/documents/search`, { 
      params: { q: query },
      headers: getAuthHeader() 
    });
    return res.data;
  },
  share: async (id) => {
    const res = await axios.post(`${API_URL}/documents/${id}/share`, {}, { headers: getAuthHeader() });
    return res.data;
  },
  unshare: async (id) => {
    const res = await axios.delete(`${API_URL}/documents/${id}/share`, { headers: getAuthHeader() });
    return res.data;
  },
  importFromUrl: async (url) => {
    const res = await axios.post(`${API_URL}/documents/import-url`, { url }, { headers: getAuthHeader() });
    return res.data;
  }
};

export const sharedAPI = {
  getDocument: async (token) => {
    const res = await axios.get(`${API_URL}/documents/shared/${token}`);
    return res.data;
  },
  getConversation: async (token) => {
    const res = await axios.get(`${API_URL}/conversations/shared/${token}`);
    return res.data;
  }
};

export const authAPI = {
  registerInit: async (email, password, name) => {
    const res = await axios.post(`${API_URL}/auth/register/init`, { email, password, name });
    return res.data;
  },
  registerVerify: async (tempToken, otp) => {
    const res = await axios.post(`${API_URL}/auth/register/verify`, { tempToken, otp });
    return res.data;
  },
  resendOTP: async (email) => {
    const res = await axios.post(`${API_URL}/auth/register/resend-otp`, { email });
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await axios.put(`${API_URL}/auth/profile`, data, { headers: getAuthHeader() });
    return res.data;
  },
  changePassword: async (data) => {
    const res = await axios.put(`${API_URL}/auth/password`, data, { headers: getAuthHeader() });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await axios.post(`${API_URL}/auth/reset-password/${token}`, { newPassword });
    return res.data;
  },
  verifyEmail: async (token) => {
    const res = await axios.post(`${API_URL}/auth/verify-email`, { token });
    return res.data;
  },
  resendVerification: async (email) => {
    const res = await axios.post(`${API_URL}/auth/resend-verification`, { email });
    return res.data;
  },
  deleteAccount: async (password) => {
    const res = await axios.delete(`${API_URL}/auth/account`, { 
      data: { password },
      headers: getAuthHeader() 
    });
    return res.data;
  },
  refreshToken: async (refreshToken) => {
    const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
    return res.data;
  },
  getSessions: async () => {
    const res = await axios.get(`${API_URL}/auth/sessions`, { headers: getAuthHeader() });
    return res.data;
  },
  logoutSession: async (sessionId) => {
    const res = await axios.delete(`${API_URL}/auth/sessions/${sessionId}`, { headers: getAuthHeader() });
    return res.data;
  },
  logoutAllSessions: async () => {
    const res = await axios.post(`${API_URL}/auth/sessions/logout-all`, {}, { headers: getAuthHeader() });
    return res.data;
  }
};

export const chatAPI = {
  sendMessage: async (message, conversationId, documentId, mode = 'assistant', onToken, stopRef) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const controller = new AbortController();
    if (stopRef) {
      stopRef.current = controller;
    }
    
    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ message, conversationId, documentId, mode }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = {};
    let lastFlush = 0;

    const processBuffer = (force = false) => {
      const now = Date.now();
      if (!force && now - lastFlush < 40) return;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token && onToken) {
              onToken(data.token);
            }
            if (data.done) {
              result = { conversationId: data.conversationId, title: data.title, citations: data.citations, followUpQuestions: data.followUpQuestions };
            }
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {}
        }
      }
      lastFlush = now;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        processBuffer(true);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      processBuffer();
    }

    return result;
  },
  summarize: async (documentId) => {
    const res = await axios.post(`${API_URL}/chat/summarize`, { documentId }, { headers: getAuthHeader() });
    return res.data;
  },
  explain: async (concept) => {
    const res = await axios.post(`${API_URL}/chat/explain`, { concept }, { headers: getAuthHeader() });
    return res.data;
  },
  grammarCheck: async (text) => {
    const res = await axios.post(`${API_URL}/chat/grammar`, { text }, { headers: getAuthHeader() });
    return res.data;
  },
  generateNotes: async (documentId) => {
    const res = await axios.post(`${API_URL}/chat/notes`, { documentId }, { headers: getAuthHeader() });
    return res.data;
  },
  generateQuiz: async (documentId, type) => {
    const res = await axios.post(`${API_URL}/chat/quiz`, { documentId, type }, { headers: getAuthHeader() });
    return res.data;
  },
  generateFlashcards: async (documentId) => {
    const res = await axios.post(`${API_URL}/chat/flashcards`, { documentId }, { headers: getAuthHeader() });
    return res.data;
  }
};

export const conversationAPI = {
  getAll: async () => {
    const res = await axios.get(`${API_URL}/conversations`, { headers: getAuthHeader() });
    return res.data;
  },
  getOne: async (id) => {
    const res = await axios.get(`${API_URL}/conversations/${id}`, { headers: getAuthHeader() });
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_URL}/conversations/${id}`, { headers: getAuthHeader() });
    return res.data;
  },
  updateFolder: async (id, folder) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/folder`, { folder }, { headers: getAuthHeader() });
    return res.data;
  },
  rename: async (id, title) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/rename`, { title }, { headers: getAuthHeader() });
    return res.data;
  },
  share: async (id) => {
    const res = await axios.post(`${API_URL}/conversations/${id}/share`, {}, { headers: getAuthHeader() });
    return res.data;
  },
  unshare: async (id) => {
    const res = await axios.delete(`${API_URL}/conversations/${id}/share`, { headers: getAuthHeader() });
    return res.data;
  }
};
