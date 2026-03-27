import { DataProvider } from '../dataProvider';
import { gasProvider, GAS_URL, callGAS } from './gasProvider';
import { User, Submission, Badge } from '../types';
import { ensureArray } from '../utils/data';
import LZString from 'lz-string';

const STORAGE_KEY = 'lms_data';

const getData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    // First check if it's plain JSON (starts with { or [)
    if (stored.startsWith('{') || stored.startsWith('[')) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse uncompressed stored data:', e);
      }
    }
    
    try {
      // Try to decompress UTF16 first (the correct way)
      const decompressed = LZString.decompressFromUTF16(stored);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
      // Fallback to standard decompress in case it was saved with the old method
      const oldDecompressed = LZString.decompress(stored);
      if (oldDecompressed) {
        return JSON.parse(oldDecompressed);
      }
    } catch (e) {
      console.error('Failed to decompress stored data:', e);
    }
  }
  return null;
};

const saveData = (data: any) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonString);
    localStorage.setItem(STORAGE_KEY, compressed);
  } catch (e) {
    console.error('Storage quota exceeded or failed to save:', e);
    // If compression still fails, try to save without compression as a last resort (unlikely to help if quota is reached)
    // Or just alert the user
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      alert('Dung lượng lưu trữ trình duyệt đã đầy. Vui lòng xóa bớt bài giảng hoặc bài nộp có dung lượng lớn.');
    }
  }
};

let currentUser: User | null = null;

function normalizeUser(user: any): User {
  if (!user) return user;
  return {
    ...user,
    badges: ensureArray(user.badges),
    xp: Number(user.xp || 0),
    level: Number(user.level || 1)
  };
}

export const hybridProvider: DataProvider = {
  login: async (username, role, password) => {
    // Always try GAS login first to ensure we have latest data and correct password
    try {
      const user = await gasProvider.login(username, role, password);
      if (user) {
        const normalizedUser = normalizeUser(user);
        currentUser = normalizedUser;
        localStorage.setItem('lms_current_user', JSON.stringify(normalizedUser));
        return normalizedUser;
      }
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.warn('GAS login failed, falling back to local data:', err);
      }
    }

    // Fallback to local data if GAS is unavailable (e.g. offline)
    let data = getData();
    
    // If local data is empty, seed it immediately
    if (!data || !data.users || data.users.length === 0) {
      const { seedData } = await import('./mockProvider');
      data = seedData();
    }

    // GUARANTEE LOGIN FOR DEMO ACCOUNTS
    if (username === 'admin' && password === '123' && role === 'teacher') {
      let user = data?.users?.find((u: any) => u.username === 'admin');
      if (!user) {
         user = { id: 't1', username: 'admin', password: '123', fullName: 'Giáo viên Quản trị', role: 'teacher' };
         if (data && data.users) { data.users.push(user); saveData(data); }
      }
      const normalizedUser = normalizeUser(user);
      currentUser = normalizedUser;
      localStorage.setItem('lms_current_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    }

    if (username === 'student' && password === '123' && role === 'student') {
      let user = data?.users?.find((u: any) => u.username === 'student');
      if (!user) {
         user = { id: 's1', username: 'student', password: '123', fullName: 'Học sinh Demo', role: 'student', classId: 'c1' };
         if (data && data.users) { data.users.push(user); saveData(data); }
      }
      const normalizedUser = normalizeUser(user);
      currentUser = normalizedUser;
      localStorage.setItem('lms_current_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    }

    if (data && data.users) {
      const user = data.users.find((u: any) => String(u.username) === String(username) && String(u.role) === String(role) && String(u.password) === String(password));
      if (user) {
        const normalizedUser = normalizeUser(user);
        currentUser = normalizedUser;
        localStorage.setItem('lms_current_user', JSON.stringify(normalizedUser));
        return normalizedUser;
      }
    }
    
    return null;
  },
  getCurrentUser: () => {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('lms_current_user');
    if (stored) {
      try {
        currentUser = normalizeUser(JSON.parse(stored));
        return currentUser;
      } catch (e) {
        console.error("Error parsing current user:", e);
        return null;
      }
    }
    return null;
  },
  logout: () => {
    currentUser = null;
    localStorage.removeItem('lms_current_user');
  },

  getList: async <T>(resource: string, params?: any): Promise<T[]> => {
    const data = getData();
    if (!data) return gasProvider.getList(resource, params);
    
    let list = data[resource] || [];
    
    if (resource === 'users') {
      list = list.map(normalizeUser);
    }
    
    if (params) {
      list = list.filter((item: any) => {
        for (const key in params) {
          if (item[key] !== params[key]) return false;
        }
        return true;
      });
    }
    return list;
  },
  getOne: async <T>(resource: string, id: string): Promise<T> => {
    const data = getData();
    if (!data) return gasProvider.getOne(resource, id);
    
    const list = data[resource] || [];
    const item = list.find((i: any) => i.id === id);
    if (!item) throw new Error('Not found');
    
    if (resource === 'users') {
      return normalizeUser(item) as any;
    }
    
    return item;
  },
  create: async <T>(resource: string, payload: any): Promise<T> => {
    let data = getData();
    const newItem = { id: payload.id || Math.random().toString(36).substr(2, 9), ...payload };
    
    if (!data) {
      data = { [resource]: [] };
    }
    
    if (!data[resource]) data[resource] = [];
    data[resource].push(newItem);
    saveData(data);
    
    // Sync with GAS and wait for it to ensure consistency
    try {
      await gasProvider.create(resource, newItem);
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.error('Sync create error:', err);
      }
    }
    
    return newItem;
  },
  createMany: async <T>(resource: string, payloads: any[]): Promise<T[]> => {
    let data = getData();
    const newItems = payloads.map(payload => ({ id: payload.id || Math.random().toString(36).substr(2, 9), ...payload }));
    
    if (!data) {
      data = { [resource]: [] };
    }
    
    if (!data[resource]) data[resource] = [];
    data[resource].push(...newItems);
    saveData(data);
    
    // Sync the whole table to GAS
    if (data[resource]) {
      try {
        await callGAS('sync_table', { table: resource, data: data[resource] });
      } catch (err: any) {
        if (err.message !== 'GAS_NOT_CONFIGURED') {
          console.error('Sync createMany error:', err);
        }
      }
    }
    
    return newItems as T[];
  },
  update: async <T>(resource: string, id: string, payload: any): Promise<T> => {
    let data = getData();
    let fullUpdatedItem = { ...payload, id };
    
    if (data) {
      const list = data[resource] || [];
      const index = list.findIndex((i: any) => i.id === id);
      if (index !== -1) {
        fullUpdatedItem = { ...list[index], ...payload };
        list[index] = fullUpdatedItem;
        saveData(data);
      }
    }
    
    // Sync with GAS and wait for it - ALWAYS send the full object to avoid wiping data in Google Sheets
    try {
      await gasProvider.update(resource, id, fullUpdatedItem);
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.error('Sync update error:', err);
      }
    }
    
    return fullUpdatedItem as T;
  },
  delete: async (resource: string, id: string): Promise<void> => {
    const data = getData();
    
    if (data) {
      const list = data[resource] || [];
      data[resource] = list.filter((i: any) => i.id !== id);
      saveData(data);
    }
    
    // Sync with GAS and wait for it
    try {
      await gasProvider.delete(resource, id);
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.error('Sync delete error:', err);
      }
    }
  },

  submitAssignment: async (submission) => {
    const data = getData();
    
    if (data) {
      if (!data.submissions) data.submissions = [];
      const existingIndex = data.submissions.findIndex(
        (s: any) => s.studentId === submission.studentId && 
          ((submission.assignmentId && s.assignmentId === submission.assignmentId) || 
           (submission.testId && s.testId === submission.testId))
      );
      
      let newSubmission: Submission;
      if (existingIndex !== -1) {
        newSubmission = {
          ...data.submissions[existingIndex],
          ...submission,
          submittedAt: new Date().toISOString()
        };
        data.submissions[existingIndex] = newSubmission;
      } else {
        newSubmission = {
          ...submission,
          id: Math.random().toString(36).substr(2, 9),
          submittedAt: new Date().toISOString()
        };
        data.submissions.push(newSubmission);
      }
      
      saveData(data);
      
      // Sync with GAS and wait for it
      try {
        await gasProvider.submitAssignment(newSubmission);
      } catch (err: any) {
        if (err.message !== 'GAS_NOT_CONFIGURED') {
          console.error('Sync submitAssignment error:', err);
        }
      }
      
      return newSubmission;
    }
    
    // Fallback if no local data
    const newSubmission: Submission = {
      ...submission,
      id: Math.random().toString(36).substr(2, 9),
      submittedAt: new Date().toISOString()
    };
    try {
      await gasProvider.submitAssignment(newSubmission);
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.error('Sync submitAssignment error:', err);
      }
    }
    return newSubmission;
  },
  gradeSubmission: async (submissionId, score, feedback) => {
    const data = getData();
    let updated: any = null;
    
    if (data) {
      const index = data.submissions.findIndex((s: any) => s.id === submissionId);
      if (index !== -1) {
        data.submissions[index] = { ...data.submissions[index], score, feedback };
        updated = data.submissions[index];
        saveData(data);
      }
    }
    
    // Sync with GAS and wait for it
    try {
      await gasProvider.gradeSubmission(submissionId, score, feedback);
    } catch (err: any) {
      if (err.message !== 'GAS_NOT_CONFIGURED') {
        console.error('Sync gradeSubmission error:', err);
      }
    }
    
    if (updated) return updated;
    return gasProvider.gradeSubmission(submissionId, score, feedback);
  },
  getStudentReport: async (studentId) => {
    return gasProvider.getStudentReport(studentId);
  },
  getClassReport: async (classId) => {
    return gasProvider.getClassReport(classId);
  },
  syncWithGAS: async () => {
    console.log('Syncing with GAS in background...');
    try {
      const data = await callGAS('fetch_all');
      if (data && data.users && data.users.length > 0) {
        saveData(data);
        console.log('Sync completed!');
      } else {
        console.log('GAS data is empty, keeping local data');
        // If local data doesn't exist, seed it
        const localData = getData();
        if (!localData || !localData.users || localData.users.length === 0) {
          import('./mockProvider').then(({ seedData }) => {
            seedData();
          });
        }
      }
    } catch (error: any) {
      if (error.message === 'GAS_NOT_CONFIGURED') {
        console.log('GAS is not configured properly, using local data');
        const localData = getData();
        if (!localData || !localData.users || localData.users.length === 0) {
          import('./mockProvider').then(({ seedData }) => {
            seedData();
          });
        }
        return;
      }
      console.error('Sync failed:', error);
      throw error;
    }
  },
  testConnection: async () => {
    return gasProvider.testConnection();
  },
  awardXP: async (userId: string, amount: number) => {
    const data = getData();
    if (!data) throw new Error('No data');
    const userIndex = data.users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    const user = data.users[userIndex];
    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    
    data.users[userIndex] = user;
    saveData(data);
    
    // Update current user if it's the one logged in
    if (currentUser && currentUser.id === userId) {
      currentUser = user;
      localStorage.setItem('lms_current_user', JSON.stringify(user));
    }
    
    // Sync with GAS
    try {
      await gasProvider.update('users', userId, user);
    } catch (e) {}
    
    return user;
  },
  awardBadge: async (userId: string, badge: Omit<Badge, 'unlockedAt'>) => {
    const data = getData();
    if (!data) throw new Error('No data');
    const userIndex = data.users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    
    const user = data.users[userIndex];
    if (!user.badges) user.badges = [];
    
    // Check if badge already exists
    if (user.badges.some((b: any) => b.id === badge.id)) return user;
    
    const newBadge = { ...badge, unlockedAt: new Date().toISOString() };
    user.badges.push(newBadge);
    
    data.users[userIndex] = user;
    saveData(data);
    
    // Update current user if it's the one logged in
    if (currentUser && currentUser.id === userId) {
      currentUser = user;
      localStorage.setItem('lms_current_user', JSON.stringify(user));
    }
    
    // Sync with GAS
    try {
      await gasProvider.update('users', userId, user);
    } catch (e) {}
    
    return user;
  },
  getLeaderboard: async () => {
    const data = getData();
    if (!data) {
      const users = await gasProvider.getList<User>('users');
      return users.filter(u => u.role === 'student').sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }
    return (data.users || []).filter((u: any) => u.role === 'student').sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
  }
};
