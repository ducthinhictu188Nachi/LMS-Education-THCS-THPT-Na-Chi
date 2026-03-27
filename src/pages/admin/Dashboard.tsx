import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Class, User, Assignment, Announcement } from '../../core/types';
import { Users, BookOpen, Bell, TrendingUp, GraduationCap, Clock, RefreshCw } from 'lucide-react';
import { initialSyncToGAS } from '../../core/utils/sync';

export const AdminDashboard: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [cls, users, ass, ann] = await Promise.all([
        dataProvider.getList<Class>('classes'),
        dataProvider.getList<User>('users', { role: 'student' }),
        dataProvider.getList<Assignment>('assignments'),
        dataProvider.getList<Announcement>('announcements')
      ]);
      setClasses(cls);
      setStudents(users);
      
      // Filter upcoming assignments
      const now = new Date();
      const upcoming = ass.filter(a => new Date(a.dueDate) > now);
      setAssignments(upcoming);
      
      setAnnouncements(ann);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Tổng số lớp */}
        <div className="bg-[#1a7a53] text-white p-6 rounded-2xl border-2 border-[#115e3e] shadow-[0_6px_0_#115e3e] hover:translate-y-[2px] hover:shadow-[0_4px_0_#115e3e] active:translate-y-[6px] active:shadow-[0_0px_0_#115e3e] transition-all flex items-center gap-4 cursor-pointer">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
            <Users size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-green-100 font-bold uppercase tracking-wider mb-1">Tổng số lớp</p>
            <p className="text-3xl font-black text-white drop-shadow-md">{classes.length}</p>
          </div>
        </div>
        
        {/* Card 2: Tổng học sinh */}
        <div className="bg-[#2563eb] text-white p-6 rounded-2xl border-2 border-[#1e40af] shadow-[0_6px_0_#1e40af] hover:translate-y-[2px] hover:shadow-[0_4px_0_#1e40af] active:translate-y-[6px] active:shadow-[0_0px_0_#1e40af] transition-all flex items-center gap-4 cursor-pointer">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-100 font-bold uppercase tracking-wider mb-1">Tổng học sinh</p>
            <p className="text-3xl font-black text-white drop-shadow-md">{students.length}</p>
          </div>
        </div>

        {/* Card 3: Bài tập sắp hạn */}
        <div className="bg-[#d97706] text-white p-6 rounded-2xl border-2 border-[#b45309] shadow-[0_6px_0_#b45309] hover:translate-y-[2px] hover:shadow-[0_4px_0_#b45309] active:translate-y-[6px] active:shadow-[0_0px_0_#b45309] transition-all flex items-center gap-4 cursor-pointer">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
            <Clock size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-amber-100 font-bold uppercase tracking-wider mb-1">Bài tập sắp hạn</p>
            <p className="text-3xl font-black text-white drop-shadow-md">{assignments.length}</p>
          </div>
        </div>

        {/* Card 4: Thông báo */}
        <div className="bg-[#db2777] text-white p-6 rounded-2xl border-2 border-[#be185d] shadow-[0_6px_0_#be185d] hover:translate-y-[2px] hover:shadow-[0_4px_0_#be185d] active:translate-y-[6px] active:shadow-[0_0px_0_#be185d] transition-all flex items-center gap-4 cursor-pointer">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
            <Bell size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-pink-100 font-bold uppercase tracking-wider mb-1">Thông báo</p>
            <p className="text-3xl font-black text-white drop-shadow-md">{announcements.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Danh sách Lớp học</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600">Tên lớp</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600">Khối</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600">GVCN</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-600">Năm học</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(cls => (
                  <tr key={cls.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{cls.name}</td>
                    <td className="py-3 px-4 text-gray-600">{cls.grade}</td>
                    <td className="py-3 px-4 text-gray-600">{cls.teacherName || 'Chưa cập nhật'}</td>
                    <td className="py-3 px-4 text-gray-600">{cls.academicYear || 'Chưa cập nhật'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Thông báo mới nhất</h3>
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h4 className="font-semibold text-gray-900">{ann.title}</h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
