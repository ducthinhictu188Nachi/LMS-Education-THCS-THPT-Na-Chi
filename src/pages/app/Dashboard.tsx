import React, { useEffect, useState } from 'react';
import { dataProvider } from '../../core/provider';
import { Lesson, Assignment, Announcement, Topic } from '../../core/types';
import { BookOpen, FileText, Bell, CheckCircle, Clock } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [les, ass, ann, top] = await Promise.all([
        dataProvider.getList<Lesson>('lessons'),
        dataProvider.getList<Assignment>('assignments'),
        dataProvider.getList<Announcement>('announcements'),
        dataProvider.getList<Topic>('topics')
      ]);
      const currentUser = dataProvider.getCurrentUser();
      const filteredAnn = ann.filter(a => 
        a.target === 'all' || 
        a.target === 'students' || 
        (currentUser?.classId && a.target === currentUser.classId)
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLessons(les);
      setAssignments(ass);
      setAnnouncements(filteredAnn);
      setTopics(top);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Xin chào, {dataProvider.getCurrentUser()?.fullName}!</h2>
        <p className="text-indigo-100 mb-6">Chào mừng bạn quay trở lại. Hãy tiếp tục hành trình học tập môn Tin học nhé.</p>
        <div className="flex gap-4">
          <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-sm">
            Học bài tiếp theo
          </button>
          <button className="bg-indigo-500 bg-opacity-30 border border-indigo-400 text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-40 transition-colors">
            Xem tiến độ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bài học gần đây</h3>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Xem tất cả</button>
            </div>
            <div className="space-y-4">
              {lessons.slice(0, 3).map(lesson => {
                const topic = topics.find(t => t.id === lesson.topicId);
                return (
                  <div key={lesson.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-indigo-600 mb-1">{topic?.name}</p>
                      <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle size={14} /> Đã hoàn thành
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bài tập cần làm</h3>
            </div>
            <div className="space-y-4">
              {assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Clock size={14} /> Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                    Làm bài
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Thông báo từ giáo viên</h3>
          </div>
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h4 className="font-semibold text-gray-900">{ann.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Không có thông báo nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
