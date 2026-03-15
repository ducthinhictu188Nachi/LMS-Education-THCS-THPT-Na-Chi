import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataProvider } from '../../core/provider';
import { Test, Submission, Class } from '../../core/types';
import { Clock, FileText, CheckCircle, AlertCircle, Play } from 'lucide-react';

export const StudentTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userClass, setUserClass] = useState<Class | null>(null);
  const navigate = useNavigate();
  const currentUser = dataProvider.getCurrentUser();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      const [allTests, allSubmissions, allClasses] = await Promise.all([
        dataProvider.getList<Test>('tests'),
        dataProvider.getList<Submission>('submissions', { studentId: currentUser.id }),
        dataProvider.getList<Class>('classes')
      ]);

      const myClass = allClasses.find(c => c.id === currentUser.classId);
      setUserClass(myClass || null);

      // Filter tests assigned to this student
      const myTests = allTests.filter(test => {
        if (!test.assignedTo) return false;
        if (test.assignedTo.type === 'class' && myClass) {
          return test.assignedTo.ids.includes(myClass.id);
        }
        if (test.assignedTo.type === 'grade' && myClass) {
          return test.assignedTo.ids.includes(myClass.grade.toString());
        }
        return false;
      });

      setTests(myTests);
      setSubmissions(allSubmissions);
    };
    fetchData();
  }, [currentUser]);

  const getTestStatus = (test: Test) => {
    const submission = submissions.find(s => s.testId === test.id);
    const now = new Date();
    const startTime = new Date(test.startTime);
    const endTime = new Date(test.endTime);

    if (submission) {
      return { status: 'completed', label: 'Đã nộp', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle size={16} /> };
    }
    if (now < startTime) {
      return { status: 'upcoming', label: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-800', icon: <Clock size={16} /> };
    }
    if (now > endTime) {
      return { status: 'missed', label: 'Quá hạn', color: 'bg-red-100 text-red-800', icon: <AlertCircle size={16} /> };
    }
    return { status: 'active', label: 'Đang mở', color: 'bg-amber-100 text-amber-800', icon: <Play size={16} /> };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bài kiểm tra của tôi</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.length > 0 ? tests.map(test => {
          const statusInfo = getTestStatus(test);
          const submission = submissions.find(s => s.testId === test.id);
          
          return (
            <div key={test.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">{test.title}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    Thời gian: {test.durationMinutes} phút
                  </p>
                  <p className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-gray-400" />
                    Hạn chót: {new Date(test.endTime).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              
              <div className="p-5 bg-gray-50 mt-auto">
                {statusInfo.status === 'completed' ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Điểm số</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {submission?.score !== undefined ? `${submission.score} / 10` : 'Chưa chấm'}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate(`/app/tests/${test.id}/result`)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                ) : statusInfo.status === 'active' ? (
                  <button 
                    onClick={() => navigate(`/app/tests/${test.id}/take`)}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <Play size={18} /> Bắt đầu làm bài
                  </button>
                ) : statusInfo.status === 'upcoming' ? (
                  <p className="text-sm text-center text-gray-500">
                    Mở lúc: {new Date(test.startTime).toLocaleString('vi-VN')}
                  </p>
                ) : (
                  <p className="text-sm text-center text-red-500 font-medium">
                    Đã hết hạn làm bài
                  </p>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có bài kiểm tra</h3>
            <p className="text-gray-500">Hiện tại bạn không có bài kiểm tra nào cần làm.</p>
          </div>
        )}
      </div>
    </div>
  );
};
