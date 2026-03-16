import React, { useState, useEffect } from 'react';
import { dataProvider } from '../../core/provider';
import { Assignment, Subject, Topic, Class } from '../../core/types';
import { FileText, Calendar, Clock, BookOpen, Download } from 'lucide-react';

export const StudentAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [userClass, setUserClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = dataProvider.getCurrentUser();
      if (!user) return;

      const [allAssignments, subData, topData, classData] = await Promise.all([
        dataProvider.getList<Assignment>('assignments'),
        dataProvider.getList<Subject>('subjects'),
        dataProvider.getList<Topic>('topics'),
        dataProvider.getList<Class>('classes')
      ]);

      setSubjects(subData);
      setTopics(topData);

      if (user.classId) {
        const uClass = classData.find(c => c.id === user.classId);
        setUserClass(uClass || null);
      }

      // Filter assignments for this student
      const myAssignments = allAssignments.filter(a => {
        // If it's specifically assigned to this student
        if (a.studentIds && a.studentIds.includes(user.id)) return true;
        // If it's assigned to their class and no specific students were selected
        if (a.classId === user.classId && (!a.studentIds || a.studentIds.length === 0)) return true;
        // If it's assigned to their grade and no specific class/students were selected
        if (userClass && a.grade === userClass.grade.toString() && !a.classId && (!a.studentIds || a.studentIds.length === 0)) return true;
        
        // Legacy assignments (tied to a lesson, no specific class/student targeting)
        if (a.lessonId && !a.classId && !a.grade && (!a.studentIds || a.studentIds.length === 0)) return true;

        return false;
      });

      // Sort by due date
      myAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      setAssignments(myAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return 'Không xác định';
    return subjects.find(s => s.id === subjectId)?.name || 'Không xác định';
  };

  const getTopicName = (topicId?: string) => {
    if (!topicId) return 'Không xác định';
    return topics.find(t => t.id === topicId)?.name || 'Không xác định';
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate).getTime() < new Date().getTime();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bài tập của tôi</h1>
        <p className="text-gray-500 mt-1">Danh sách các bài tập được giao</p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có bài tập nào</h3>
          <p className="text-gray-500">Bạn hiện không có bài tập nào cần hoàn thành.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assignment => {
            const overdue = isOverdue(assignment.dueDate);
            return (
              <div key={assignment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className={`h-2 ${overdue ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                      <BookOpen size={14} />
                      {getSubjectName(assignment.subjectId)}
                    </span>
                    {overdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">
                        <Clock size={14} /> Quá hạn
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                        <Clock size={14} /> Đang mở
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{assignment.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1">{assignment.description}</p>
                  
                  {assignment.attachments && assignment.attachments.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-medium text-gray-700">Tài liệu đính kèm:</p>
                      {assignment.attachments.map((att, idx) => (
                        <a 
                          key={idx}
                          href={att}
                          download={`Tai_lieu_bai_tap_${idx + 1}`}
                          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Download size={16} />
                          <span className="truncate">Tải xuống tài liệu {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={16} className={overdue ? 'text-red-500' : 'text-gray-400'} />
                      <span className={overdue ? 'text-red-600 font-medium' : ''}>
                        Hạn nộp: {formatDate(assignment.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
