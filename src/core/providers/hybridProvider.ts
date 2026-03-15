import { DataProvider } from '../dataProvider';
import { gasProvider, GAS_URL, callGAS } from './gasProvider';
import { User, Submission } from '../types';
import LZString from 'lz-string';

const STORAGE_KEY = 'lms_data';

const getData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      // Try to decompress first
      const decompressed = LZString.decompress(stored);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
      // Fallback for uncompressed data
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored data:', e);
      return null;
    }
  }
  return null;
};

const saveData = (data: any) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = LZString.compress(jsonString);
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

export const hybridProvider: DataProvider = {
  login: async (username, role, password) => {
    // Always try GAS login first to ensure we have latest data and correct password
    try {
      const user = await gasProvider.login(username, role, password);
      if (user) {
        currentUser = user;
        localStorage.setItem('lms_current_user', JSON.stringify(user));
        return user;
      }
    } catch (err) {
      console.warn('GAS login failed, falling back to local data:', err);
    }

    // Fallback to local data if GAS is unavailable (e.g. offline)
    const data = getData();
    if (data) {
      const user = data.users.find((u: any) => String(u.username) === String(username) && String(u.role) === String(role) && String(u.password) === String(password));
      if (user) {
        currentUser = user;
        localStorage.setItem('lms_current_user', JSON.stringify(user));
        return user;
      }
    }
    
    return null;
  },
  getCurrentUser: () => {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('lms_current_user');
    if (stored) {
      currentUser = JSON.parse(stored);
      return currentUser;
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
    return item;
  },
  create: async <T>(resource: string, payload: any): Promise<T> => {
    const data = getData();
    const newItem = { id: payload.id || Math.random().toString(36).substr(2, 9), ...payload };
    
    if (data) {
      if (!data[resource]) data[resource] = [];
      data[resource].push(newItem);
      saveData(data);
    }
    
    // Background sync
    gasProvider.create(resource, newItem).catch(err => console.error('Background sync create error:', err));
    
    return newItem;
  },
  createMany: async <T>(resource: string, payloads: any[]): Promise<T[]> => {
    const data = getData();
    const newItems = payloads.map(payload => ({ id: payload.id || Math.random().toString(36).substr(2, 9), ...payload }));
    
    if (data) {
      if (!data[resource]) data[resource] = [];
      data[resource].push(...newItems);
      saveData(data);
    }
    
    // Background sync the whole table
    if (data && data[resource]) {
      callGAS('sync_table', { table: resource, data: data[resource] }).catch(err => console.error('Background sync createMany error:', err));
    }
    
    return newItems as T[];
  },
  update: async <T>(resource: string, id: string, payload: any): Promise<T> => {
    const data = getData();
    const updatedItem = { ...payload, id };
    
    if (data) {
      const list = data[resource] || [];
      const index = list.findIndex((i: any) => i.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...payload };
        saveData(data);
      }
    }
    
    // Background sync
    gasProvider.update(resource, id, payload).catch(err => console.error('Background sync update error:', err));
    
    return updatedItem as T;
  },
  delete: async (resource: string, id: string): Promise<void> => {
    const data = getData();
    
    if (data) {
      const list = data[resource] || [];
      data[resource] = list.filter((i: any) => i.id !== id);
      saveData(data);
    }
    
    // Background sync
    gasProvider.delete(resource, id).catch(err => console.error('Background sync delete error:', err));
  },

  submitAssignment: async (submission) => {
    const data = getData();
    const newSubmission: Submission = {
      ...submission,
      id: Math.random().toString(36).substr(2, 9),
      submittedAt: new Date().toISOString()
    };
    
    if (data) {
      if (!data.submissions) data.submissions = [];
      data.submissions.push(newSubmission);
      saveData(data);
    }
    
    // Background sync
    gasProvider.submitAssignment(submission).catch(err => console.error('Background sync submitAssignment error:', err));
    
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
    
    // Background sync
    gasProvider.gradeSubmission(submissionId, score, feedback).catch(err => console.error('Background sync gradeSubmission error:', err));
    
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
      saveData(data);
      console.log('Sync completed!');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  },
  testConnection: async () => {
    return gasProvider.testConnection();
  }
};
