import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { dataProvider } from '../../core/provider';
import { Lesson, Subject, Topic, Progress } from '../../core/types';

export const StudentLessons = () => {
  const user = dataProvider.getCurrentUser();
  const navigate = useNavigate();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [lesData, subData, topData, progData] = await Promise.all([
      dataProvider.getList<Lesson>('lessons'),
      dataProvider.getList<Subject>('subjects'),
      dataProvider.getList<Topic>('topics'),
      dataProvider.getList<Progress>('progresses')
    ]);
    
    // Only show published lessons
    setLessons(lesData.filter(l => l.status === 'published'));
    setSubjects(subData);
    setTopics(topData);
    setProgress(progData.filter(p => p.studentId === user?.id));
  };

  // Group lessons by Subject -> Topic
  const groupedLessons = subjects.map(subject => {
    const subjectTopics = topics.filter(t => t.subjectId === subject.id);
    const subjectLessons = lessons.filter(l => subjectTopics.some(t => t.id === l.topicId));
    
    return {
      ...subject,
      topics: subjectTopics.map(topic => ({
        ...topic,
        lessons: subjectLessons.filter(l => l.topicId === topic.id).sort((a, b) => a.order - b.order)
      })).filter(t => t.lessons.length > 0)
    };
  }).filter(s => s.topics.length > 0);

  const getLessonProgress = (lessonId: string) => {
    return progress.find(p => p.lessonId === lessonId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bài học của tôi</h1>
        <p className="text-gray-500 mt-1">Danh sách các bài học được giao</p>
      </div>

      <div className="space-y-8">
        {groupedLessons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Chưa có bài học nào</h3>
            <p className="text-gray-500 mt-1">Hiện tại chưa có bài học nào được xuất bản cho bạn.</p>
          </div>
        ) : (
          groupedLessons.map(subject => (
            <div key={subject.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-indigo-50/50 border-b border-gray-100">
                <h2 className="text-lg font-bold text-indigo-900">{subject.name}</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {subject.topics.map(topic => (
                  <div key={topic.id}>
                    <h3 className="font-semibold text-gray-800 mb-3">{topic.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {topic.lessons.map(lesson => {
                        const prog = getLessonProgress(lesson.id);
                        const isCompleted = prog?.completed;
                        
                        return (
                          <div 
                            key={lesson.id}
                            onClick={() => navigate(`/app/lessons/${lesson.id}`)}
                            className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                <BookOpen size={20} />
                              </div>
                              {isCompleted && (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                  <CheckCircle size={14} />
                                  Đã học
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {lesson.title}
                            </h4>
                            
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                              <Clock size={14} />
                              <span>{isCompleted && prog.completedAt ? `Hoàn thành: ${new Date(prog.completedAt).toLocaleDateString('vi-VN')}` : 'Chưa học'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
