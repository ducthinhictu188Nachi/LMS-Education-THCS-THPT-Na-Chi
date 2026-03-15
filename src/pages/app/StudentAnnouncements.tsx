import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Announcement } from '../../core/types';
import { Bell } from 'lucide-react';

export const StudentAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const ann = await dataProvider.getList<Announcement>('announcements');
      const currentUser = dataProvider.getCurrentUser();
      const filteredAnn = ann.filter(a => 
        a.target === 'all' || 
        a.target === 'students' || 
        (currentUser?.classId && a.target === currentUser.classId)
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAnnouncements(filteredAnn);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="text-indigo-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Thông báo</h2>
      </div>

      <div className="grid gap-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{ann.title}</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{ann.content}</p>
            <p className="text-xs text-gray-400 mt-4">
              Đăng lúc: {new Date(ann.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Chưa có thông báo nào.</p>
          </div>
        )}
      </div>
    </div>
  );
};
