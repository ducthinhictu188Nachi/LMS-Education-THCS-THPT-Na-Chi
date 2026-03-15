import { DataProvider } from '../dataProvider';
import { User, Class, Subject, Topic, Lesson, Assignment, Test, Submission, Progress, Announcement } from '../types';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzOh60w3UXVl4av1nbZaaTGpkgY15t2nhXRh1OKdDHrhYiymxlVhyg-0KO0BLGtA6cC/exec';

let currentUser: User | null = null;

export async function callGAS(action: string, payload: any = {}) {
  console.log(`[GAS] Calling action: ${action}`, payload);
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors', // Đảm bảo chế độ cors để nhận được phản hồi
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, payload }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[GAS] Response for ${action}:`, result);
    
    if (!result.ok) {
      throw new Error(result.error || 'Lỗi không xác định từ Google Script');
    }
    return result.data;
  } catch (error) {
    console.error(`[GAS] Connection Error (${action}):`, error);
    throw error;
  }
}

export const gasProvider: DataProvider = {
  login: async (username, role, password) => {
    const allData = await callGAS('fetch_all');
    const users = allData.users || [];
    const user = users.find((u: User) => String(u.username) === String(username) && String(u.role) === String(role) && String(u.password) === String(password));
    if (user) {
      // Sync all data from GAS to local storage on login
      localStorage.setItem('lms_data', JSON.stringify(allData));
      
      currentUser = user;
      localStorage.setItem('lms_current_user', JSON.stringify(user));
      return user;
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
    const allData = await callGAS('fetch_all');
    let list = allData[resource] || [];
    
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
    const allData = await callGAS('fetch_all');
    const list = allData[resource] || [];
    const item = list.find((i: any) => i.id === id);
    if (!item) throw new Error('Not found');
    return item;
  },
  create: async <T>(resource: string, payload: any): Promise<T> => {
    const newItem = { ...payload, id: Math.random().toString(36).substr(2, 9) };
    await callGAS('upsert_record', { table: resource, record: newItem });
    return newItem;
  },
  update: async <T>(resource: string, id: string, payload: any): Promise<T> => {
    const record = { ...payload, id };
    await callGAS('upsert_record', { table: resource, record });
    return record as T;
  },
  delete: async (resource: string, id: string): Promise<void> => {
    await callGAS('delete_record', { table: resource, id });
  },

  submitAssignment: async (submission) => {
    const newSubmission: Submission = {
      ...submission,
      id: Math.random().toString(36).substr(2, 9),
      submittedAt: new Date().toISOString()
    };
    await callGAS('upsert_record', { table: 'submissions', record: newSubmission });
    return newSubmission;
  },
  gradeSubmission: async (submissionId, score, feedback) => {
    const submission = await gasProvider.getOne<Submission>('submissions', submissionId);
    const updated = { ...submission, score, feedback };
    await callGAS('upsert_record', { table: 'submissions', record: updated });
    return updated;
  },
  getStudentReport: async (studentId) => {
    return { message: 'Báo cáo học sinh từ Google Sheet' };
  },
  getClassReport: async (classId) => {
    return { message: 'Báo cáo lớp học từ Google Sheet' };
  },
  syncWithGAS: async () => {
    // gasProvider is already synced with GAS by definition
    return;
  },
  testConnection: async () => {
    try {
      const data = await callGAS('fetch_all');
      if (data) {
        return { ok: true, message: 'Kết nối Google Sheet thành công!' };
      }
      return { ok: false, message: 'Kết nối thành công nhưng không có dữ liệu.' };
    } catch (error) {
      return { ok: false, message: `Lỗi kết nối: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
};
