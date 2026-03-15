import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, BookOpen, CheckCircle, XCircle, Sparkles, Loader2, FileText, Upload, FileUp, Users, Check, Video, HelpCircle, Code, Image as ImageIcon, GripVertical } from 'lucide-react';
import { dataProvider } from '../../core/provider';
import { Lesson, Subject, Topic, Assignment, Submission, User, InteractiveBlock, Class } from '../../core/types';
import { Modal } from '../../components/Modal';
import { GoogleGenAI } from '@google/genai';

const LessonManagement = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  // Filters
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterTopicId, setFilterTopicId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    grade: '10',
    classId: '',
    subjectId: '',
    topicId: '',
    status: 'draft' as 'draft' | 'published',
    order: 1,
    pptUrl: '',
    interactiveContent: [] as InteractiveBlock[]
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Assignment State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedLessonForAssignment, setSelectedLessonForAssignment] = useState<Lesson | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'manual' | 'ai' | 'file'>('manual');
  const [assignmentFormData, setAssignmentFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] // Default 1 week
  });
  const [isGeneratingAssignment, setIsGeneratingAssignment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Grading State
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedLessonForGrading, setSelectedLessonForGrading] = useState<Lesson | null>(null);
  const [lessonAssignments, setLessonAssignments] = useState<Assignment[]>([]);
  const [lessonSubmissions, setLessonSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [gradingData, setGradingData] = useState<{ score: string, feedback: string }>({ score: '', feedback: '' });
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [lesData, subData, topData, classData] = await Promise.all([
      dataProvider.getList<Lesson>('lessons'),
      dataProvider.getList<Subject>('subjects'),
      dataProvider.getList<Topic>('topics'),
      dataProvider.getList<Class>('classes')
    ]);
    setLessons(lesData);
    setSubjects(subData);
    setTopics(topData);
    setClasses(classData);
  };

  const handleOpenModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      const topic = topics.find(t => t.id === lesson.topicId);
      setFormData({
        title: lesson.title,
        content: lesson.content,
        grade: lesson.grade || '10',
        classId: lesson.classId || '',
        subjectId: topic?.subjectId || '',
        topicId: lesson.topicId,
        status: lesson.status || 'draft',
        order: lesson.order,
        pptUrl: lesson.pptUrl || '',
        interactiveContent: lesson.interactiveContent || []
      });
    } else {
      setEditingLesson(null);
      setFormData({
        title: '',
        content: '',
        grade: '10',
        classId: '',
        subjectId: '',
        topicId: '',
        status: 'draft',
        order: lessons.length + 1,
        pptUrl: '',
        interactiveContent: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topicId) {
      alert('Vui lòng chọn chủ đề');
      return;
    }

    const lessonData = {
      title: formData.title,
      content: formData.content,
      grade: formData.grade,
      classId: formData.classId,
      topicId: formData.topicId,
      status: formData.status,
      order: formData.order,
      pptUrl: formData.pptUrl,
      interactiveContent: formData.interactiveContent
    };

    if (editingLesson) {
      await dataProvider.update('lessons', editingLesson.id, lessonData);
    } else {
      await dataProvider.create('lessons', lessonData);
    }

    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await dataProvider.delete('lessons', confirmDelete);
      setConfirmDelete(null);
      fetchData();
    }
  };

  const toggleStatus = async (lesson: Lesson) => {
    const newStatus = lesson.status === 'published' ? 'draft' : 'published';
    await dataProvider.update('lessons', lesson.id, { status: newStatus });
    fetchData();
  };

  const addInteractiveBlock = (type: InteractiveBlock['type']) => {
    const newBlock: InteractiveBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: type === 'quiz' ? { question: '', options: ['', ''], correctAnswer: '' } : { content: '' }
    };
    setFormData(prev => ({
      ...prev,
      interactiveContent: [...prev.interactiveContent, newBlock]
    }));
  };

  const removeInteractiveBlock = (id: string) => {
    setFormData(prev => ({
      ...prev,
      interactiveContent: prev.interactiveContent.filter(b => b.id !== id)
    }));
  };

  const updateBlockData = (id: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      interactiveContent: prev.interactiveContent.map(b => b.id === id ? { ...b, data: { ...b.data, ...data } } : b)
    }));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...formData.interactiveContent];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setFormData(prev => ({ ...prev, interactiveContent: newBlocks }));
  };

  const handleGenerateContent = async () => {
    if (!formData.subjectId || !formData.topicId || !formData.title) {
      alert('Vui lòng chọn môn học, chủ đề và nhập tiêu đề bài giảng trước khi tạo nội dung.');
      return;
    }

    const subject = subjects.find(s => s.id === formData.subjectId);
    const topic = topics.find(t => t.id === formData.topicId);

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là một giáo viên chuyên nghiệp. Hãy viết "Yêu cầu cần đạt" (Learning Objectives) và nội dung tóm tắt cho bài học sau:
      - Môn học: ${subject?.name}
      - Khối/Lớp: ${formData.grade}
      - Chủ đề: ${topic?.name}
      - Tiêu đề bài học: ${formData.title}
      
      Yêu cầu:
      - Trình bày rõ ràng, súc tích bằng tiếng Việt.
      - Gạch đầu dòng các yêu cầu cần đạt về kiến thức, kỹ năng, thái độ.
      - Viết dưới dạng văn bản thuần túy (không dùng markdown phức tạp).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (response.text) {
        setFormData(prev => ({ ...prev, content: response.text }));
      }
    } catch (error) {
      console.error("Error generating content:", error);
      alert('Có lỗi xảy ra khi tạo nội dung. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenAssignmentModal = (lesson: Lesson) => {
    setSelectedLessonForAssignment(lesson);
    setAssignmentMode('manual');
    setAssignmentFormData({
      title: `Bài tập: ${lesson.title}`,
      description: '',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
    });
    setSelectedFile(null);
    setIsAssignmentModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerateAssignmentFromAI = async () => {
    if (!selectedLessonForAssignment) return;
    
    setIsGeneratingAssignment(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let contents: any = `Bạn là một giáo viên chuyên nghiệp. Hãy tạo một bài tập về nhà (hoặc bài thực hành) cho học sinh dựa trên bài học sau:
      - Tiêu đề bài học: ${selectedLessonForAssignment.title}
      - Nội dung bài học: ${selectedLessonForAssignment.content}
      
      Yêu cầu:
      - Tạo 3-5 câu hỏi tự luận hoặc bài tập thực hành.
      - Trình bày rõ ràng, dễ hiểu.
      - Trả về nội dung bài tập dưới dạng văn bản thuần túy.`;

      if (assignmentMode === 'file' && selectedFile) {
        // If it's a PDF, we can try to send it to Gemini
        if (selectedFile.type === 'application/pdf') {
           const reader = new FileReader();
           const base64Promise = new Promise<string>((resolve) => {
             reader.onload = () => {
               const base64 = (reader.result as string).split(',')[1];
               resolve(base64);
             };
             reader.readAsDataURL(selectedFile);
           });
           const base64Data = await base64Promise;
           
           contents = {
             parts: [
               {
                 inlineData: {
                   mimeType: 'application/pdf',
                   data: base64Data
                 }
               },
               {
                 text: `Dựa vào tài liệu đính kèm và bài học "${selectedLessonForAssignment.title}", hãy tạo một bài tập về nhà gồm 3-5 câu hỏi tự luận hoặc bài tập thực hành.`
               }
             ]
           };
        } else {
           // For docx/pptx, we simulate extraction since we can't easily parse them in browser without heavy libs
           contents = `Dựa vào tài liệu "${selectedFile.name}" (giả lập nội dung) và bài học "${selectedLessonForAssignment.title}", hãy tạo một bài tập về nhà gồm 3-5 câu hỏi tự luận hoặc bài tập thực hành.`;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
      });

      if (response.text) {
        setAssignmentFormData(prev => ({ ...prev, description: response.text }));
      }
    } catch (error) {
      console.error("Error generating assignment:", error);
      alert('Có lỗi xảy ra khi tạo bài tập bằng AI. Vui lòng thử lại.');
    } finally {
      setIsGeneratingAssignment(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForAssignment) return;

    const assignmentData = {
      lessonId: selectedLessonForAssignment.id,
      title: assignmentFormData.title,
      description: assignmentFormData.description,
      dueDate: new Date(assignmentFormData.dueDate).toISOString()
    };

    await dataProvider.create('assignments', assignmentData);
    alert('Đã giao bài tập thành công!');
    setIsAssignmentModalOpen(false);
  };

  const handleOpenGradingModal = async (lesson: Lesson) => {
    setSelectedLessonForGrading(lesson);
    
    // Fetch assignments for this lesson
    const allAssignments = await dataProvider.getList<Assignment>('assignments');
    const assignmentsForLesson = allAssignments.filter(a => a.lessonId === lesson.id);
    setLessonAssignments(assignmentsForLesson);

    // Fetch submissions for these assignments
    const allSubmissions = await dataProvider.getList<Submission>('submissions');
    const assignmentIds = assignmentsForLesson.map(a => a.id);
    const submissionsForLesson = allSubmissions.filter(s => s.assignmentId && assignmentIds.includes(s.assignmentId));
    setLessonSubmissions(submissionsForLesson);

    // Fetch students
    const allUsers = await dataProvider.getList<User>('users', { role: 'student' });
    setStudents(allUsers);

    setIsGradingModalOpen(true);
  };

  const handleSaveGrade = async (submissionId: string) => {
    try {
      const scoreNum = parseFloat(gradingData.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
        alert('Điểm số phải từ 0 đến 10');
        return;
      }
      
      const updatedSubmission = await dataProvider.gradeSubmission(submissionId, scoreNum, gradingData.feedback);
      setLessonSubmissions(prev => prev.map(s => s.id === submissionId ? updatedSubmission : s));
      setEditingSubmissionId(null);
      setGradingData({ score: '', feedback: '' });
    } catch (error) {
      console.error("Error saving grade:", error);
      alert('Có lỗi xảy ra khi lưu điểm.');
    }
  };

  const filteredTopics = topics.filter(t => t.subjectId === formData.subjectId);
  const filterTopicsForList = topics.filter(t => !filterSubjectId || t.subjectId === filterSubjectId);
  const filteredClassesForForm = classes.filter(c => c.grade.toString() === formData.grade);
  const filteredClassesForList = classes.filter(c => !filterGrade || c.grade.toString() === filterGrade);

  const filteredLessons = lessons.filter(lesson => {
    if (filterGrade && lesson.grade !== filterGrade) return false;
    if (filterClassId && lesson.classId !== filterClassId) return false;
    if (filterTopicId && lesson.topicId !== filterTopicId) return false;
    if (filterStatus && lesson.status !== filterStatus) return false;
    if (searchTitle && !lesson.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
    
    if (filterSubjectId) {
      const topic = topics.find(t => t.id === lesson.topicId);
      if (!topic || topic.subjectId !== filterSubjectId) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Bài giảng</h1>
          <p className="text-gray-500 mt-1">Soạn thảo và quản lý nội dung bài học</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Thêm bài giảng</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Khối</label>
          <select
            value={filterGrade}
            onChange={e => { setFilterGrade(e.target.value); setFilterClassId(''); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Tất cả</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Lớp</label>
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={!filterGrade}
          >
            <option value="">Tất cả</option>
            {filteredClassesForList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Môn học</label>
          <select
            value={filterSubjectId}
            onChange={e => { setFilterSubjectId(e.target.value); setFilterTopicId(''); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Tất cả</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Chủ đề</label>
          <select
            value={filterTopicId}
            onChange={e => setFilterTopicId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={!filterSubjectId}
          >
            <option value="">Tất cả</option>
            {filterTopicsForList.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tìm bài học</label>
          <input
            type="text"
            value={searchTitle}
            onChange={e => setSearchTitle(e.target.value)}
            placeholder="Tên bài học..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-4 px-6 text-sm font-semibold text-gray-600">Tiêu đề</th>
              <th className="py-4 px-6 text-sm font-semibold text-gray-600">Khối/Lớp</th>
              <th className="py-4 px-6 text-sm font-semibold text-gray-600">Chủ đề</th>
              <th className="py-4 px-6 text-sm font-semibold text-gray-600">Trạng thái</th>
              <th className="py-4 px-6 text-sm font-semibold text-gray-600 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.map(lesson => {
              const topic = topics.find(t => t.id === lesson.topicId);
              const cls = classes.find(c => c.id === lesson.classId);
              return (
                <tr key={lesson.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <BookOpen size={20} />
                      </div>
                      <span className="font-medium text-gray-900">{lesson.title}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    Khối {lesson.grade} {cls ? `- ${cls.name}` : ''}
                  </td>
                  <td className="py-4 px-6 text-gray-600">{topic?.name || '---'}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => toggleStatus(lesson)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        lesson.status === 'published' 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {lesson.status === 'published' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {lesson.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenGradingModal(lesson)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Chấm bài"
                      >
                        <Users size={18} />
                        <span className="text-xs font-medium hidden sm:inline">Chấm bài</span>
                      </button>
                      <button
                        onClick={() => handleOpenAssignmentModal(lesson)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Giao bài tập"
                      >
                        <FileText size={18} />
                        <span className="text-xs font-medium hidden sm:inline">Giao bài</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(lesson)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(lesson.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredLessons.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  Chưa có bài giảng nào phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLesson ? 'Chỉnh sửa bài giảng' : 'Thêm bài giảng mới'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề bài giảng</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="VD: Bài 1: Thông tin và xử lý thông tin"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
              <select
                value={formData.grade}
                onChange={e => setFormData({...formData, grade: e.target.value, classId: ''})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lớp (Tùy chọn)</label>
              <select
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Tất cả lớp --</option>
                {filteredClassesForForm.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as 'draft' | 'published'})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Xuất bản</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
              <select
                value={formData.subjectId}
                onChange={e => setFormData({...formData, subjectId: e.target.value, topicId: ''})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">-- Chọn môn học --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select
                value={formData.topicId}
                onChange={e => setFormData({...formData, topicId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                disabled={!formData.subjectId}
              >
                <option value="">-- Chọn chủ đề --</option>
                {filteredTopics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Nội dung (Yêu cầu cần đạt)</label>
              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={isGenerating || !formData.subjectId || !formData.topicId || !formData.title}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Tạo bằng AI</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder="Nhập nội dung bài học hoặc yêu cầu cần đạt..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tài liệu PowerPoint (.ppt, .pptx)</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.pptUrl}
                  onChange={e => setFormData({...formData, pptUrl: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder="URL file PowerPoint hoặc tải lên..."
                />
              </div>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-sm font-medium">
                <Upload size={18} />
                <span>Tải lên</span>
                <input
                  type="file"
                  accept=".ppt,.pptx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check size (max 2MB)
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Vui lòng chọn file PowerPoint có dung lượng nhỏ hơn 2MB để đảm bảo hiệu suất.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setFormData({...formData, pptUrl: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            {formData.pptUrl && formData.pptUrl.startsWith('data:') && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <Check size={12} /> Đã tải lên file: {formData.pptUrl.length > 1000 ? 'PowerPoint Data' : formData.pptUrl}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-gray-700">Nội dung tương tác</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addInteractiveBlock('text')}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100 flex items-center gap-1 text-xs font-medium"
                  title="Thêm văn bản"
                >
                  <FileText size={14} /> Văn bản
                </button>
                <button
                  type="button"
                  onClick={() => addInteractiveBlock('video')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 flex items-center gap-1 text-xs font-medium"
                  title="Thêm Video"
                >
                  <Video size={14} /> Video
                </button>
                <button
                  type="button"
                  onClick={() => addInteractiveBlock('quiz')}
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100 flex items-center gap-1 text-xs font-medium"
                  title="Thêm câu hỏi trắc nghiệm"
                >
                  <HelpCircle size={14} /> Trắc nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => addInteractiveBlock('code')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 flex items-center gap-1 text-xs font-medium"
                  title="Thêm mã nguồn"
                >
                  <Code size={14} /> Code
                </button>
                <button
                  type="button"
                  onClick={() => addInteractiveBlock('image')}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 flex items-center gap-1 text-xs font-medium"
                  title="Thêm hình ảnh"
                >
                  <ImageIcon size={14} /> Ảnh
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {formData.interactiveContent.map((block, index) => (
                <div key={block.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical size={16} className="text-gray-400 cursor-move" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {block.type === 'text' && 'Văn bản'}
                        {block.type === 'video' && 'Video'}
                        {block.type === 'quiz' && 'Trắc nghiệm'}
                        {block.type === 'code' && 'Mã nguồn'}
                        {block.type === 'image' && 'Hình ảnh'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInteractiveBlock(block.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      value={block.data.content}
                      onChange={e => updateBlockData(block.id, { content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Nhập nội dung văn bản..."
                      rows={3}
                    />
                  )}

                  {block.type === 'video' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={block.data.url}
                        onChange={e => updateBlockData(block.id, { url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="URL Video (YouTube, v.v.)"
                      />
                      <input
                        type="text"
                        value={block.data.caption}
                        onChange={e => updateBlockData(block.id, { caption: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Chú thích video"
                      />
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={block.data.url}
                        onChange={e => updateBlockData(block.id, { url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="URL Hình ảnh"
                      />
                      <input
                        type="text"
                        value={block.data.caption}
                        onChange={e => updateBlockData(block.id, { caption: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Chú thích hình ảnh"
                      />
                    </div>
                  )}

                  {block.type === 'code' && (
                    <div className="space-y-2">
                      <select
                        value={block.data.language}
                        onChange={e => updateBlockData(block.id, { language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                      </select>
                      <textarea
                        value={block.data.content}
                        onChange={e => updateBlockData(block.id, { content: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Nhập mã nguồn..."
                        rows={4}
                      />
                    </div>
                  )}

                  {block.type === 'quiz' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={block.data.question}
                        onChange={e => updateBlockData(block.id, { question: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Câu hỏi trắc nghiệm..."
                      />
                      <div className="space-y-2">
                        {block.data.options?.map((option: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`quiz-${block.id}`}
                              checked={block.data.correctAnswer === option}
                              onChange={() => updateBlockData(block.id, { correctAnswer: option })}
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={e => {
                                const newOptions = [...(block.data.options || [])];
                                newOptions[optIdx] = e.target.value;
                                updateBlockData(block.id, { options: newOptions });
                              }}
                              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder={`Lựa chọn ${optIdx + 1}`}
                            />
                            {block.data.options!.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = block.data.options!.filter((_: any, i: number) => i !== optIdx);
                                  updateBlockData(block.id, { options: newOptions });
                                }}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...(block.data.options || []), ''];
                            updateBlockData(block.id, { options: newOptions });
                          }}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          + Thêm lựa chọn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {formData.interactiveContent.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                  Chưa có nội dung tương tác nào. Hãy thêm các khối nội dung bên trên.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Lưu bài giảng
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác nhận xóa */}
      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Xác nhận xóa"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-6">Bạn có chắc chắn muốn xóa bài giảng này không?</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Giao bài tập */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title="Giao bài tập cho học sinh"
      >
        <form onSubmit={handleSubmitAssignment} className="p-6 space-y-5">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <BookOpen size={18} />
            Bài giảng: {selectedLessonForAssignment?.title}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức tạo bài tập</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAssignmentMode('manual')}
                className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  assignmentMode === 'manual' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                <Edit2 size={18} />
                Thủ công
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('ai')}
                className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  assignmentMode === 'ai' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                <Sparkles size={18} />
                Tạo bằng AI
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('file')}
                className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  assignmentMode === 'file' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                <FileUp size={18} />
                Từ File
              </button>
            </div>
          </div>

          {assignmentMode === 'file' && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.pptx"
                className="hidden" 
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                  <Upload size={24} />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {selectedFile ? selectedFile.name : 'Tải lên file PDF, Word (.docx) hoặc PowerPoint (.pptx)'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Chọn file
                </button>
              </div>
            </div>
          )}

          {(assignmentMode === 'ai' || (assignmentMode === 'file' && selectedFile)) && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGenerateAssignmentFromAI}
                disabled={isGeneratingAssignment}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-70"
              >
                {isGeneratingAssignment ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isGeneratingAssignment ? 'AI đang xử lý...' : 'Tạo bài tập tự động'}
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề bài tập</label>
              <input
                type="text"
                required
                value={assignmentFormData.title}
                onChange={e => setAssignmentFormData({...assignmentFormData, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp bài</label>
              <input
                type="date"
                required
                value={assignmentFormData.dueDate}
                onChange={e => setAssignmentFormData({...assignmentFormData, dueDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung bài tập</label>
              <textarea
                required
                rows={6}
                value={assignmentFormData.description}
                onChange={e => setAssignmentFormData({...assignmentFormData, description: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Nhập nội dung bài tập, câu hỏi..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAssignmentModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              Giao bài
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chấm bài */}
      <Modal
        isOpen={isGradingModalOpen}
        onClose={() => { setIsGradingModalOpen(false); setEditingSubmissionId(null); }}
        title="Chấm bài học sinh"
      >
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <BookOpen size={18} />
            Bài giảng: {selectedLessonForGrading?.title}
          </div>

          {lessonAssignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có bài tập nào được giao cho bài giảng này.
            </div>
          ) : (
            <div className="space-y-8">
              {lessonAssignments.map(assignment => {
                const submissions = lessonSubmissions.filter(s => s.assignmentId === assignment.id);
                
                return (
                  <div key={assignment.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-bold text-gray-900">{assignment.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')} • {submissions.length} bài nộp</p>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {submissions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Chưa có học sinh nào nộp bài.
                        </div>
                      ) : (
                        submissions.map(submission => {
                          const student = students.find(s => s.id === submission.studentId);
                          const isEditing = editingSubmissionId === submission.id;
                          
                          return (
                            <div key={submission.id} className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="font-bold text-gray-900">{student?.fullName || 'Học sinh ẩn danh'}</span>
                                  <span className="text-xs text-gray-500 ml-2">({student?.username})</span>
                                  <p className="text-xs text-gray-400 mt-1">Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}</p>
                                </div>
                                {!isEditing && (
                                  <div className="text-right">
                                    {submission.score !== undefined ? (
                                      <div className="flex flex-col items-end">
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm">
                                          {submission.score}/10
                                        </span>
                                        <button 
                                          onClick={() => {
                                            setEditingSubmissionId(submission.id);
                                            setGradingData({ score: submission.score?.toString() || '', feedback: submission.feedback || '' });
                                          }}
                                          className="text-xs text-indigo-600 hover:underline mt-1"
                                        >
                                          Sửa điểm
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setEditingSubmissionId(submission.id);
                                          setGradingData({ score: '', feedback: '' });
                                        }}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-medium rounded-lg text-sm hover:bg-indigo-100 transition-colors"
                                      >
                                        Chấm điểm
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 whitespace-pre-wrap mb-3 border border-gray-100">
                                {submission.content || <span className="italic text-gray-400">Không có nội dung văn bản</span>}
                              </div>

                              {submission.fileName && (
                                <div className="mb-3 flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">File đính kèm:</span>
                                  <a 
                                    href={submission.fileUrl} 
                                    download={submission.fileName} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 transition-colors"
                                  >
                                    <FileText size={14} />
                                    {submission.fileName}
                                  </a>
                                </div>
                              )}

                              {isEditing ? (
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-700">Điểm số (0-10):</label>
                                    <input 
                                      type="number" 
                                      min="0" max="10" step="0.5"
                                      value={gradingData.score}
                                      onChange={e => setGradingData({...gradingData, score: e.target.value})}
                                      className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nhận xét:</label>
                                    <textarea 
                                      rows={2}
                                      value={gradingData.feedback}
                                      onChange={e => setGradingData({...gradingData, feedback: e.target.value})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                      placeholder="Nhập nhận xét cho học sinh..."
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                      onClick={() => setEditingSubmissionId(null)}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                      Hủy
                                    </button>
                                    <button 
                                      onClick={() => handleSaveGrade(submission.id)}
                                      className="px-4 py-1.5 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                    >
                                      <Check size={16} /> Lưu điểm
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                submission.feedback && (
                                  <div className="text-sm text-gray-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                    <span className="font-semibold text-amber-800">Nhận xét: </span>
                                    {submission.feedback}
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LessonManagement;
