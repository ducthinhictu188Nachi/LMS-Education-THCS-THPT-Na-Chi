import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, BookOpen, FileText, Send, AlertCircle, Upload, File as FileIcon, X, Video, HelpCircle, Code, Image as ImageIcon, Check } from 'lucide-react';
import { dataProvider } from '../../core/provider';
import { Lesson, Progress, Assignment, Submission, InteractiveBlock } from '../../core/types';

export const LessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = dataProvider.getCurrentUser();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [submissionContents, setSubmissionContents] = useState<Record<string, string>>({});
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, { file: File, base64: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [isMarking, setIsMarking] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizFeedback, setQuizFeedback] = useState<Record<string, { correct: boolean, message: string }>>({});

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    try {
      const lesData = await dataProvider.getOne<Lesson>('lessons', id!);
      setLesson(lesData);
      
      const progData = await dataProvider.getList<Progress>('progresses');
      const userProgress = progData.find(p => p.studentId === user?.id && p.lessonId === id);
      setProgress(userProgress || null);

      // Fetch assignments for this lesson
      const allAssignments = await dataProvider.getList<Assignment>('assignments');
      const lessonAssignments = allAssignments.filter(a => a.lessonId === id);
      setAssignments(lessonAssignments);

      // Fetch submissions for these assignments by this student
      const allSubmissions = await dataProvider.getList<Submission>('submissions');
      const studentSubmissions = allSubmissions.filter(s => s.studentId === user?.id && s.assignmentId);
      
      const subsMap: Record<string, Submission> = {};
      studentSubmissions.forEach(sub => {
        if (sub.assignmentId) {
          subsMap[sub.assignmentId] = sub;
        }
      });
      setSubmissions(subsMap);

    } catch (error) {
      console.error("Error fetching lesson:", error);
      navigate('/app/lessons');
    }
  };

  const handleContentChange = (assignmentId: string, content: string) => {
    setSubmissionContents(prev => ({ ...prev, [assignmentId]: content }));
  };

  const handleFileChange = (assignmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 2MB to avoid localStorage quota issues)
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn file có dung lượng nhỏ hơn 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSubmissionFiles(prev => ({
        ...prev,
        [assignmentId]: { file, base64: reader.result as string }
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (assignmentId: string) => {
    setSubmissionFiles(prev => {
      const newState = { ...prev };
      delete newState[assignmentId];
      return newState;
    });
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!user) return;
    const content = submissionContents[assignmentId] || '';
    const fileData = submissionFiles[assignmentId];
    
    if (!content.trim() && !fileData) {
      alert('Vui lòng nhập nội dung bài làm hoặc tải file đính kèm.');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const newSubmission = await dataProvider.submitAssignment({
        assignmentId,
        studentId: user.id,
        content: content.trim(),
        fileName: fileData?.file.name,
        fileUrl: fileData?.base64
      });
      
      setSubmissions(prev => ({ ...prev, [assignmentId]: newSubmission }));
      alert('Nộp bài thành công!');
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert('Có lỗi xảy ra khi nộp bài.');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleMarkAsLearned = async () => {
    if (!user || !lesson || isMarking) return;
    
    setIsMarking(true);
    try {
      if (progress) {
        // Already marked, maybe unmark? For now just keep it marked.
        return;
      }
      
      const newProgress: Omit<Progress, 'id'> = {
        studentId: user.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date().toISOString()
      };
      
      const created = await dataProvider.create<Progress>('progresses', newProgress);
      setProgress(created);
    } catch (error) {
      console.error("Error marking as learned:", error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleQuizSubmit = (blockId: string, selectedOption: string, correctAnswer: string) => {
    setQuizAnswers(prev => ({ ...prev, [blockId]: selectedOption }));
    const isCorrect = selectedOption === correctAnswer;
    setQuizFeedback(prev => ({ 
      ...prev, 
      [blockId]: { 
        correct: isCorrect, 
        message: isCorrect ? 'Chính xác! Chúc mừng bạn.' : `Chưa đúng rồi. Đáp án đúng là: ${correctAnswer}` 
      } 
    }));
  };

  const renderInteractiveBlock = (block: InteractiveBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className="my-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
            {block.data.content}
          </div>
        );
      case 'video':
        const videoId = block.data.url?.includes('youtube.com/watch?v=') 
          ? block.data.url.split('v=')[1].split('&')[0]
          : block.data.url?.includes('youtu.be/')
          ? block.data.url.split('youtu.be/')[1].split('?')[0]
          : null;

        return (
          <div key={block.id} className="my-8">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
              {videoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={block.data.caption || "Video lesson"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white gap-2">
                  <Video size={32} />
                  <span>Video URL không hợp lệ</span>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-center text-sm text-gray-500 mt-3 italic">{block.data.caption}</p>
            )}
          </div>
        );
      case 'image':
        return (
          <div key={block.id} className="my-8">
            <img 
              src={block.data.url} 
              alt={block.data.caption || "Lesson image"} 
              className="rounded-2xl shadow-md max-w-full mx-auto"
              referrerPolicy="no-referrer"
            />
            {block.data.caption && (
              <p className="text-center text-sm text-gray-500 mt-3 italic">{block.data.caption}</p>
            )}
          </div>
        );
      case 'code':
        return (
          <div key={block.id} className="my-6">
            <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 rounded-t-xl text-xs font-mono">
              <span>{block.data.language?.toUpperCase() || 'CODE'}</span>
              <Code size={14} />
            </div>
            <pre className="bg-gray-900 text-emerald-400 p-4 rounded-b-xl overflow-x-auto font-mono text-sm">
              <code>{block.data.content}</code>
            </pre>
          </div>
        );
      case 'quiz':
        const feedback = quizFeedback[block.id];
        const selected = quizAnswers[block.id];

        return (
          <div key={block.id} className="my-10 p-6 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-700 mb-4">
              <HelpCircle size={20} />
              <span className="font-bold">Câu hỏi tương tác</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-4">{block.data.question}</h4>
            <div className="space-y-3">
              {block.data.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => !feedback && handleQuizSubmit(block.id, option, block.data.correctAnswer || '')}
                  disabled={!!feedback}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    selected === option
                      ? feedback?.correct
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : feedback && option === block.data.correctAnswer
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white hover:border-indigo-300 text-gray-700'
                  }`}
                >
                  <span>{option}</span>
                  {selected === option && (
                    feedback?.correct ? <Check size={18} /> : <X size={18} />
                  )}
                  {feedback && option === block.data.correctAnswer && selected !== option && (
                    <Check size={18} />
                  )}
                </button>
              ))}
            </div>
            {feedback && (
              <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${feedback.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {feedback.correct ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                <p className="font-medium">{feedback.message}</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/app/lessons')}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        <span>Quay lại danh sách bài học</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 bg-indigo-50/50 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <BookOpen size={20} />
                <span className="font-medium">Bài giảng</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
            </div>
            
            {progress?.completed ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium">
                <CheckCircle size={20} />
                <span>Đã hoàn thành</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-medium">
                <Clock size={20} />
                <span>Chưa hoàn thành</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="prose prose-indigo max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Nội dung / Yêu cầu cần đạt</h3>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-100">
              {lesson.content}
            </div>
          </div>

          {lesson.pptUrl && (
            <div className="mt-8 p-6 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <FileIcon size={20} />
                  <span className="font-bold">Tài liệu PowerPoint</span>
                </div>
                <a 
                  href={lesson.pptUrl} 
                  download={`${lesson.title}.pptx`}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Upload size={16} className="rotate-180" />
                  Tải về máy
                </a>
              </div>
              
              {lesson.pptUrl.startsWith('http') ? (
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(lesson.pptUrl)}&embedded=true`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="PowerPoint Viewer"
                  ></iframe>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                  <FileIcon size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">File PowerPoint đã được tải lên. Nhấn nút "Tải về máy" để xem nội dung.</p>
                </div>
              )}
            </div>
          )}

          {/* Interactive Content Blocks */}
          {lesson.interactiveContent && lesson.interactiveContent.length > 0 && (
            <div className="mt-8 space-y-2">
              {lesson.interactiveContent.map(block => renderInteractiveBlock(block))}
            </div>
          )}

          {assignments.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" size={24} />
                Bài tập về nhà
              </h3>
              
              <div className="space-y-6">
                {assignments.map(assignment => {
                  const submission = submissions[assignment.id];
                  const isPastDue = new Date(assignment.dueDate) < new Date();
                  
                  return (
                    <div key={assignment.id} className="bg-white border-2 border-indigo-50 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{assignment.title}</h4>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={14} />
                            Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                            {isPastDue && !submission && <span className="text-red-500 font-medium ml-2">(Đã quá hạn)</span>}
                          </p>
                        </div>
                        {submission && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle size={14} />
                            Đã nộp
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-indigo-50/50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap text-sm mb-6 border border-indigo-100">
                        {assignment.description}
                      </div>

                      {submission ? (
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h5 className="text-sm font-bold text-gray-700 mb-2">Bài làm của bạn:</h5>
                            <div className="text-gray-600 whitespace-pre-wrap text-sm">
                              {submission.content || <span className="italic text-gray-400">Không có nội dung văn bản</span>}
                            </div>
                            {submission.fileName && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">File đính kèm:</span>
                                <a 
                                  href={submission.fileUrl} 
                                  download={submission.fileName} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 transition-colors"
                                >
                                  <FileIcon size={14} />
                                  <span className="truncate max-w-[200px]">{submission.fileName}</span>
                                </a>
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-3">
                              Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          
                          {(submission.score !== undefined || submission.feedback) && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                              <h5 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Nhận xét từ giáo viên:
                              </h5>
                              {submission.score !== undefined && (
                                <p className="text-amber-900 font-bold mb-1">Điểm: {submission.score}/10</p>
                              )}
                              {submission.feedback && (
                                <p className="text-amber-800 text-sm whitespace-pre-wrap">{submission.feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            rows={5}
                            placeholder="Nhập câu trả lời của bạn vào đây..."
                            value={submissionContents[assignment.id] || ''}
                            onChange={(e) => handleContentChange(assignment.id, e.target.value)}
                            disabled={isPastDue}
                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${isPastDue ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                <Upload size={16} />
                                Tải file lên
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".docx,.pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileChange(assignment.id, e)}
                                  disabled={isPastDue}
                                />
                              </label>
                              
                              {submissionFiles[assignment.id] && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-200">
                                  <FileIcon size={14} className="text-indigo-600" />
                                  <span className="truncate max-w-[150px]">{submissionFiles[assignment.id].file.name}</span>
                                  <button 
                                    onClick={() => removeFile(assignment.id)} 
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    disabled={isPastDue}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleSubmitAssignment(assignment.id)}
                              disabled={isSubmitting[assignment.id] || isPastDue || (!submissionContents[assignment.id]?.trim() && !submissionFiles[assignment.id])}
                              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              {isSubmitting[assignment.id] ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              ) : (
                                <Send size={18} />
                              )}
                              <span>Nộp bài</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="mt-10 flex justify-center border-t border-gray-100 pt-8">
            <button
              onClick={handleMarkAsLearned}
              disabled={progress?.completed || isMarking}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-lg transition-all ${
                progress?.completed 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <CheckCircle size={24} />
              <span>{progress?.completed ? 'Bạn đã hoàn thành bài học này' : 'Đánh dấu đã học'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
