import React, { useState, useEffect } from 'react';
import { dataProvider } from '../../core/provider';
import { BankQuestion, Subject, Topic, QuestionType, QuestionDifficulty } from '../../core/types';
import { Plus, Edit2, Trash2, Search, Filter, Sparkles, Upload, Loader2, Save, X, Download, FileText } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { GoogleGenAI, Type } from '@google/genai';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState<Partial<BankQuestion>>({
    type: 'multiple_choice',
    difficulty: 'recognition',
    content: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1,
    subjectId: '',
    topicId: ''
  });

  // AI Gen state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState({
    subjectId: '',
    topicId: '',
    count: 5,
    types: { multiple_choice: true, true_false: false, short_answer: false, essay: false },
    difficulties: { recognition: 2, understanding: 2, application: 1 }
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAnswerFile, setSelectedAnswerFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importConfig, setImportConfig] = useState({ subjectId: '', topicId: '' });

  const downloadTemplate = (type: 'question' | 'answer') => {
    let content = '';
    let filename = '';

    if (type === 'question') {
      content = `HƯỚNG DẪN ĐỊNH DẠNG FILE ĐỀ BÀI (PDF/DOCX)

1. Cấu trúc câu hỏi trắc nghiệm:
Câu 1: Nội dung câu hỏi...
A. Lựa chọn 1
B. Lựa chọn 2
C. Lựa chọn 3
D. Lựa chọn 4

2. Cấu trúc câu hỏi Đúng/Sai:
Câu 2: Nội dung câu hỏi...
a) Mệnh đề 1
b) Mệnh đề 2
c) Mệnh đề 3
d) Mệnh đề 4

3. Cấu trúc câu hỏi tự luận/trả lời ngắn:
Câu 3: Nội dung câu hỏi...

LƯU Ý: 
- Có thể ghi chú chủ đề ở đầu file: CHỦ ĐỀ: [Tên chủ đề]
- Hệ thống sử dụng AI để nhận diện nên định dạng cần rõ ràng, rành mạch.`;
      filename = 'mau_de_bai.txt';
    } else {
      content = `HƯỚNG DẪN ĐỊNH DẠNG FILE ĐÁP ÁN (PDF/DOCX)

BẢNG ĐÁP ÁN
1. A
2. B
3. C
4. D
5. Đúng - Sai - Đúng - Đúng (Cho câu hỏi Đúng/Sai)
6. [Nội dung đáp án ngắn]

LƯU Ý:
- Số thứ tự đáp án phải khớp với số thứ tự câu hỏi trong file đề bài.
- Đối với câu hỏi Đúng/Sai, liệt kê đáp án theo thứ tự các mệnh đề a, b, c, d.`;
      filename = 'mau_dap_an.txt';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [qData, sData, tData] = await Promise.all([
        dataProvider.getList<BankQuestion>('bank_questions'),
        dataProvider.getList<Subject>('subjects'),
        dataProvider.getList<Topic>('topics')
      ]);
      setQuestions(qData);
      setSubjects(sData);
      setTopics(tData);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const handleOpenQuestionModal = (question?: BankQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({ ...question });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        type: 'multiple_choice',
        difficulty: 'recognition',
        content: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        subjectId: filterSubject || (subjects.length > 0 ? subjects[0].id : ''),
        topicId: filterTopic || ''
      });
    }
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await dataProvider.update('bank_questions', editingQuestion.id, questionForm);
      } else {
        await dataProvider.create('bank_questions', { ...questionForm, createdAt: new Date().toISOString() });
      }
      setIsQuestionModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving question", error);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      try {
        await dataProvider.delete('bank_questions', id);
        fetchData();
      } catch (error) {
        console.error("Error deleting question", error);
      }
    }
  };

  const parseTruncatedJSON = (jsonString: string) => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch (e: any) {
      if (e.message.includes('Unterminated string') || e.message.includes('Unexpected end of JSON input') || e.message.includes('Expected')) {
        let fixedString = jsonString;
        while (fixedString && fixedString.length > 0) {
          const lastBrace = fixedString.lastIndexOf('}');
          if (lastBrace === -1) break;
          fixedString = fixedString.substring(0, lastBrace + 1) + ']';
          try {
            return JSON.parse(fixedString);
          } catch (err) {
            fixedString = fixedString.substring(0, lastBrace);
          }
        }
      }
      throw e;
    }
  };

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Tạo ${aiConfig.count} câu hỏi kiểm tra về chủ đề: "${aiPrompt}".
      
      Cấu trúc độ khó mong muốn:
      - Nhận biết: ${aiConfig.difficulties.recognition} câu
      - Thông hiểu: ${aiConfig.difficulties.understanding} câu
      - Vận dụng: ${aiConfig.difficulties.application} câu
      
      Các loại câu hỏi cần tạo:
      ${Object.entries(aiConfig.types).filter(([_, v]) => v).map(([k, _]) => `- ${k}`).join('\n')}
      
      Trả về mảng JSON các câu hỏi. Mỗi câu hỏi có định dạng:
      {
        "id": "tạo_id_ngẫu_nhiên",
        "type": "multiple_choice" | "true_false" | "short_answer" | "essay",
        "difficulty": "recognition" | "understanding" | "application",
        "content": "Nội dung câu hỏi",
        "points": 1,
        "options": ["A", "B", "C", "D"], // Chỉ dành cho multiple_choice
        "correctAnswer": "Đáp án đúng", // Dành cho multiple_choice, short_answer, essay (hướng dẫn chấm)
        "subQuestions": [ // Chỉ dành cho true_false
          { "id": "a", "content": "Mệnh đề 1", "correctAnswer": true },
          { "id": "b", "content": "Mệnh đề 2", "correctAnswer": false }
        ]
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                content: { type: Type.STRING },
                points: { type: Type.NUMBER },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                subQuestions: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      content: { type: Type.STRING },
                      correctAnswer: { type: Type.BOOLEAN }
                    }
                  } 
                }
              },
              required: ["id", "type", "difficulty", "content", "points"]
            }
          }
        }
      });

      const jsonText = response.text || '[]';
      const generatedQuestions = parseTruncatedJSON(jsonText);
      
      const newQuestionsPayloads = generatedQuestions.map((q: any) => ({
        ...q,
        subjectId: aiConfig.subjectId,
        topicId: aiConfig.topicId,
        createdAt: new Date().toISOString()
      }));

      if (dataProvider.createMany && newQuestionsPayloads.length > 0) {
        await dataProvider.createMany('bank_questions', newQuestionsPayloads);
      } else {
        for (const q of newQuestionsPayloads) {
          await dataProvider.create('bank_questions', q);
        }
      }
      
      setIsAIGenModalOpen(false);
      fetchData();
      alert(`Đã tạo thành công ${generatedQuestions.length} câu hỏi!`);
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("Có lỗi xảy ra khi tạo câu hỏi. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File PDF quá lớn (tối đa 10MB). Vui lòng chọn file nhỏ hơn.');
      return;
    }

    setIsExtracting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const fileReader = new FileReader();
      fileReader.readAsDataURL(selectedFile);
      
      fileReader.onload = async () => {
        const base64Data = (fileReader.result as string).split(',')[1];
        
        let contents: any = [
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf"
            }
          },
          { text: `Bạn là một chuyên gia khảo thí và xây dựng đề kiểm tra theo định dạng của Bộ Giáo dục và Đào tạo Việt Nam (Công văn 7991).
          Nhiệm vụ của bạn là đọc, phân tích và trích xuất TOÀN BỘ các câu hỏi từ file PDF này một cách chính xác nhất. KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ CÂU HỎI NÀO.
          
          Cấu trúc đề thi thường có 3 phần chính theo định dạng mới của Bộ GD&ĐT:
          - Phần I: Câu hỏi trắc nghiệm nhiều lựa chọn (multiple_choice). Thường có 4 phương án A, B, C, D.
          - Phần II: Câu hỏi trắc nghiệm Đúng/Sai (true_false). Đây là phần quan trọng nhất. 
            + Mỗi câu hỏi lớn (ví dụ: Câu 1, Câu 2...) sẽ có một đoạn Lệnh dẫn/Ngữ cảnh (context).
            + Sau đó là 4 ý lựa chọn được đánh dấu là a), b), c), d).
            + Bạn PHẢI trích xuất mỗi câu hỏi lớn này thành MỘT đối tượng JSON với type là 'true_false'.
            + Mảng 'subQuestions' PHẢI chứa đầy đủ 4 ý a, b, c, d.
          - Phần III: Câu hỏi trắc nghiệm trả lời ngắn (short_answer).
          - Phần IV (nếu có): Tự luận (essay).

          Trả về mảng JSON các câu hỏi, bao gồm cả phần giải thích (explanation) ngắn gọn cho đáp án.
          Định dạng JSON cho mỗi câu hỏi:
          {
            "id": "tạo_id_ngẫu_nhiên",
            "type": "multiple_choice" | "true_false" | "short_answer" | "essay",
            "difficulty": "recognition" | "understanding" | "application",
            "content": "Nội dung câu hỏi (đối với Phần II là nội dung dẫn/Lệnh dẫn)",
            "points": 1,
            "explanation": "Giải thích đáp án chung",
            "options": ["A", "B", "C", "D"], // Chỉ dành cho multiple_choice
            "correctAnswer": "Đáp án đúng", // Dành cho multiple_choice, short_answer, essay
            "subQuestions": [ // BẮT BUỘC dành cho true_false, gồm 4 ý a, b, c, d
              { "id": "a", "content": "Nội dung ý a", "correctAnswer": true, "explanation": "Giải thích tại sao đúng/sai", "difficulty": "recognition" },
              { "id": "b", "content": "Nội dung ý b", "correctAnswer": false, "explanation": "Giải thích tại sao đúng/sai", "difficulty": "recognition" },
              { "id": "c", "content": "Nội dung ý c", "correctAnswer": true, "explanation": "Giải thích tại sao đúng/sai", "difficulty": "recognition" },
              { "id": "d", "content": "Nội dung ý d", "correctAnswer": false, "explanation": "Giải thích tại sao đúng/sai", "difficulty": "recognition" }
            ]
          }
          
          ĐỐI VỚI CÂU HỎI ĐÚNG/SAI (true_false):
          - Quy tắc: 
            1. Lệnh dẫn/Ngữ cảnh (content): Là phần văn bản nêu tình huống, đoạn mã code hoặc bảng dữ liệu chung.
            2. Các ý lựa chọn (subQuestions): Luôn gồm 4 ý ký hiệu là a), b), c), d).
            3. Đáp án (correctAnswer): Mỗi ý a, b, c, d chỉ nhận giá trị là true (Đúng) hoặc false (Sai).
          - Hãy tìm các câu hỏi có cấu trúc: "Câu X. [Nội dung dẫn] ... a) [Ý 1] ... b) [Ý 2] ... c) [Ý 3] ... d) [Ý 4]".
          - Mỗi câu hỏi lớn như vậy phải được trích xuất thành MỘT đối tượng JSON.
          - Đảm bảo trích xuất đầy đủ nội dung của cả 4 ý nhỏ.` }
        ];

        if (selectedAnswerFile) {
          const answerReader = new FileReader();
          answerReader.readAsDataURL(selectedAnswerFile);
          await new Promise(resolve => {
            answerReader.onload = () => {
              const ansBase64 = (answerReader.result as string).split(',')[1];
              contents.splice(1, 0, {
                inlineData: {
                  data: ansBase64,
                  mimeType: "application/pdf"
                }
              });
              contents[2].text += `\n\nSử dụng file PDF thứ hai làm đáp án để điền vào trường correctAnswer. Đảm bảo trích xuất đầy đủ và chính xác tất cả các đáp án tương ứng với từng câu hỏi.`;
              resolve(null);
            };
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  content: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  subQuestions: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        content: { type: Type.STRING },
                        difficulty: { type: Type.STRING, description: "Mức độ: 'recognition', 'understanding', 'application'" },
                        correctAnswer: { type: Type.BOOLEAN },
                        explanation: { type: Type.STRING }
                      }
                    } 
                  }
                },
                required: ["id", "type", "content"]
              }
            }
          }
        });

        const jsonText = response.text || '[]';
        const extractedQuestions = parseTruncatedJSON(jsonText);
        
        const newQuestionsPayloads = extractedQuestions.map((q: any) => ({
          ...q,
          subjectId: importConfig.subjectId,
          topicId: importConfig.topicId,
          createdAt: new Date().toISOString()
        }));

        if (dataProvider.createMany && newQuestionsPayloads.length > 0) {
          await dataProvider.createMany('bank_questions', newQuestionsPayloads);
        } else {
          for (const q of newQuestionsPayloads) {
            await dataProvider.create('bank_questions', q);
          }
        }
        
        setIsImportModalOpen(false);
        setSelectedFile(null);
        setSelectedAnswerFile(null);
        fetchData();
        alert(`Đã trích xuất và thêm thành công ${extractedQuestions.length} câu hỏi!`);
        setIsExtracting(false);
      };
    } catch (error) {
      console.error("Error extracting questions:", error);
      alert("Có lỗi xảy ra khi trích xuất. Vui lòng thử lại.");
      setIsExtracting(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (search && !q.content?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && q.subjectId !== filterSubject) return false;
    if (filterTopic && q.topicId !== filterTopic) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterType && q.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ngân hàng câu hỏi</h2>
          <p className="text-gray-500">Quản lý kho câu hỏi trắc nghiệm và tự luận</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
          >
            <Upload size={20} /> Nhập từ PDF
          </button>
          <button 
            onClick={() => setIsAIGenModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
          >
            <Sparkles size={20} /> Tạo bằng AI
          </button>
          <button 
            onClick={() => handleOpenQuestionModal()}
            className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus size={20} /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Tìm kiếm nội dung câu hỏi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select 
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả môn học</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select 
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả chủ đề</option>
          {topics.filter(t => !filterSubject || t.subjectId === filterSubject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select 
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả mức độ</option>
          <option value="recognition">Nhận biết</option>
          <option value="understanding">Thông hiểu</option>
          <option value="application">Vận dụng</option>
        </select>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả loại</option>
          <option value="multiple_choice">Trắc nghiệm</option>
          <option value="true_false">Đúng/Sai</option>
          <option value="short_answer">Trả lời ngắn</option>
          <option value="essay">Tự luận</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-16">ID</th>
              <th className="py-3 px-6 text-sm font-semibold text-gray-600">Nội dung</th>
              <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-32">Loại</th>
              <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-32">Mức độ</th>
              <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-24 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
              <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-sm text-gray-500">{q.id.substring(0, 6)}</td>
                <td className="py-4 px-6">
                  <div className="font-medium text-gray-900 line-clamp-2">{q.content}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {subjects.find(s => s.id === q.subjectId)?.name} 
                    {q.topicId && ` - ${topics.find(t => t.id === q.topicId)?.name}`}
                  </div>
                </td>
                <td className="py-4 px-6 text-sm">
                  {q.type === 'multiple_choice' ? 'Trắc nghiệm' : q.type === 'true_false' ? 'Đúng/Sai' : q.type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    q.difficulty === 'recognition' ? 'bg-blue-100 text-blue-800' :
                    q.difficulty === 'understanding' ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {q.difficulty === 'recognition' ? 'Nhận biết' : q.difficulty === 'understanding' ? 'Thông hiểu' : 'Vận dụng'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpenQuestionModal(q)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">Không tìm thấy câu hỏi nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestion ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
              <select 
                required
                value={questionForm.subjectId}
                onChange={e => setQuestionForm({...questionForm, subjectId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn môn học</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select 
                value={questionForm.topicId}
                onChange={e => setQuestionForm({...questionForm, topicId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn chủ đề</option>
                {topics.filter(t => !questionForm.subjectId || t.subjectId === questionForm.subjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại câu hỏi</label>
              <select 
                value={questionForm.type}
                onChange={e => setQuestionForm({...questionForm, type: e.target.value as QuestionType})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="multiple_choice">Trắc nghiệm nhiều lựa chọn</option>
                <option value="true_false">Đúng/Sai</option>
                <option value="short_answer">Trả lời ngắn</option>
                <option value="essay">Tự luận</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
              <select 
                value={questionForm.difficulty}
                onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="recognition">Nhận biết</option>
                <option value="understanding">Thông hiểu</option>
                <option value="application">Vận dụng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi (Lệnh dẫn/Ngữ cảnh)</label>
            <textarea 
              required
              value={questionForm.content}
              onChange={e => setQuestionForm({...questionForm, content: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Nhập nội dung câu hỏi hoặc lệnh dẫn/ngữ cảnh chung..."
            />
          </div>

          {questionForm.type === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Các lựa chọn</label>
              {questionForm.options?.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    type="radio" 
                    name="correctAnswer"
                    checked={questionForm.correctAnswer === opt && opt !== ''}
                    onChange={() => setQuestionForm({...questionForm, correctAnswer: opt})}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <input 
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...(questionForm.options || [])];
                      newOptions[idx] = e.target.value;
                      setQuestionForm({...questionForm, options: newOptions});
                      if (questionForm.correctAnswer === opt) {
                        setQuestionForm({...questionForm, options: newOptions, correctAnswer: e.target.value});
                      }
                    }}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newOptions = [...(questionForm.options || [])];
                      newOptions.splice(idx, 1);
                      setQuestionForm({...questionForm, options: newOptions});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={() => setQuestionForm({...questionForm, options: [...(questionForm.options || []), '']})}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
              >
                + Thêm lựa chọn
              </button>
            </div>
          )}

          {questionForm.type === 'true_false' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Các mệnh đề</label>
              {questionForm.subQuestions?.map((sq, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                  <span className="font-bold w-6">{sq.id})</span>
                  <input 
                    type="text"
                    value={sq.content}
                    onChange={(e) => {
                      const newSubs = [...(questionForm.subQuestions || [])];
                      newSubs[idx].content = e.target.value;
                      setQuestionForm({...questionForm, subQuestions: newSubs});
                    }}
                    placeholder={`Mệnh đề ${idx + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <select
                    value={sq.correctAnswer ? 'true' : 'false'}
                    onChange={(e) => {
                      const newSubs = [...(questionForm.subQuestions || [])];
                      newSubs[idx].correctAnswer = e.target.value === 'true';
                      setQuestionForm({...questionForm, subQuestions: newSubs});
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="true">Đúng</option>
                    <option value="false">Sai</option>
                  </select>
                  <input 
                    type="text"
                    value={sq.explanation || ''}
                    onChange={(e) => {
                      const newSubs = [...(questionForm.subQuestions || [])];
                      newSubs[idx].explanation = e.target.value;
                      setQuestionForm({...questionForm, subQuestions: newSubs});
                    }}
                    placeholder="Giải thích..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newSubs = [...(questionForm.subQuestions || [])];
                      newSubs.splice(idx, 1);
                      setQuestionForm({...questionForm, subQuestions: newSubs});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={() => setQuestionForm({
                  ...questionForm, 
                  subQuestions: [...(questionForm.subQuestions || []), { id: String.fromCharCode(97 + (questionForm.subQuestions?.length || 0)), content: '', difficulty: 'recognition', correctAnswer: true }]
                })}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
              >
                + Thêm mệnh đề
              </button>
            </div>
          )}

          {(questionForm.type === 'short_answer' || questionForm.type === 'essay') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án / Hướng dẫn chấm</label>
              <textarea 
                value={questionForm.correctAnswer as string || ''}
                onChange={e => setQuestionForm({...questionForm, correctAnswer: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Nhập đáp án hoặc các ý chính cần có để chấm điểm..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giải thích đáp án</label>
            <textarea 
              value={questionForm.explanation || ''}
              onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              placeholder="Nhập giải thích ngắn gọn cho đáp án..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <button 
              type="button" 
              onClick={() => setIsQuestionModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Lưu câu hỏi
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Generate Modal */}
      <Modal
        isOpen={isAIGenModalOpen}
        onClose={() => setIsAIGenModalOpen(false)}
        title="Tạo câu hỏi bằng AI"
      >
        <form onSubmit={handleGenerateQuestions} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
              <select 
                required
                value={aiConfig.subjectId}
                onChange={e => setAiConfig({...aiConfig, subjectId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn môn học</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select 
                value={aiConfig.topicId}
                onChange={e => setAiConfig({...aiConfig, topicId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn chủ đề</option>
                {topics.filter(t => !aiConfig.subjectId || t.subjectId === aiConfig.subjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Nội dung cần tạo</label>
            <textarea 
              required
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="VD: Các thành phần cơ bản của máy tính, hệ điều hành Windows..."
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={aiConfig.types.multiple_choice} onChange={e => setAiConfig({...aiConfig, types: {...aiConfig.types, multiple_choice: e.target.checked}})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm">Trắc nghiệm nhiều lựa chọn</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={aiConfig.types.true_false} onChange={e => setAiConfig({...aiConfig, types: {...aiConfig.types, true_false: e.target.checked}})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm">Đúng/Sai</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={aiConfig.types.short_answer} onChange={e => setAiConfig({...aiConfig, types: {...aiConfig.types, short_answer: e.target.checked}})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm">Trả lời ngắn</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={aiConfig.types.essay} onChange={e => setAiConfig({...aiConfig, types: {...aiConfig.types, essay: e.target.checked}})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm">Tự luận</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng theo mức độ</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nhận biết:</span>
                  <input type="number" min="0" value={aiConfig.difficulties.recognition} onChange={e => setAiConfig({...aiConfig, difficulties: {...aiConfig.difficulties, recognition: parseInt(e.target.value) || 0}})} className="w-16 px-2 py-1 border rounded-lg text-center" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Thông hiểu:</span>
                  <input type="number" min="0" value={aiConfig.difficulties.understanding} onChange={e => setAiConfig({...aiConfig, difficulties: {...aiConfig.difficulties, understanding: parseInt(e.target.value) || 0}})} className="w-16 px-2 py-1 border rounded-lg text-center" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vận dụng:</span>
                  <input type="number" min="0" value={aiConfig.difficulties.application} onChange={e => setAiConfig({...aiConfig, difficulties: {...aiConfig.difficulties, application: parseInt(e.target.value) || 0}})} className="w-16 px-2 py-1 border rounded-lg text-center" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <button 
              type="button" 
              onClick={() => setIsAIGenModalOpen(false)}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={isGenerating || !aiPrompt || !aiConfig.subjectId}
              className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Tạo câu hỏi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import PDF Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập câu hỏi từ file PDF"
      >
        <form onSubmit={handleImportQuestions} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
              <select 
                required
                value={importConfig.subjectId}
                onChange={e => setImportConfig({...importConfig, subjectId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn môn học</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select 
                value={importConfig.topicId}
                onChange={e => setImportConfig({...importConfig, topicId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Chọn chủ đề</option>
                {topics.filter(t => !importConfig.subjectId || t.subjectId === importConfig.subjectId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">1. File đề bài (Bắt buộc)</label>
                <button 
                  type="button"
                  onClick={() => downloadTemplate('question')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <Download size={14} /> Tải file mẫu
                </button>
              </div>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>{selectedFile ? selectedFile.name : 'Tải lên file PDF'}</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept=".pdf" 
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        disabled={isExtracting}
                      />
                    </label>
                    {!selectedFile && <p className="pl-1">hoặc kéo thả vào đây</p>}
                  </div>
                  <p className="text-xs text-gray-500">Chỉ hỗ trợ file PDF</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">2. File đáp án (Tùy chọn)</label>
                <button 
                  type="button"
                  onClick={() => downloadTemplate('answer')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <Download size={14} /> Tải file mẫu
                </button>
              </div>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="answer-file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>{selectedAnswerFile ? selectedAnswerFile.name : 'Tải lên file PDF đáp án'}</span>
                      <input 
                        id="answer-file-upload" 
                        name="answer-file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept=".pdf" 
                        onChange={(e) => setSelectedAnswerFile(e.target.files?.[0] || null)}
                        disabled={isExtracting}
                      />
                    </label>
                    {!selectedAnswerFile && <p className="pl-1">hoặc kéo thả vào đây</p>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Hệ thống sẽ dùng AI để tự động trích xuất câu hỏi và đáp án từ các file này.</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
            <h4 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
              <FileText size={14} /> Hướng dẫn định dạng nhanh:
            </h4>
            <ul className="text-[10px] text-amber-700 space-y-1 list-disc pl-4">
              <li><b>Trắc nghiệm:</b> Câu 1: ... A. ... B. ... C. ... D. ...</li>
              <li><b>Đúng/Sai:</b> Câu 2: ... a) ... b) ... c) ... d) ...</li>
              <li><b>Đáp án:</b> Bảng đáp án: 1. A, 2. B, 3. Đúng - Sai...</li>
              <li>Nên sử dụng file PDF có văn bản rõ ràng để AI trích xuất tốt nhất.</li>
            </ul>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t">
            <button 
              type="button" 
              onClick={() => setIsImportModalOpen(false)}
              disabled={isExtracting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={isExtracting || !selectedFile || !importConfig.subjectId}
              className="flex items-center gap-2 px-4 py-2 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang trích xuất...</span>
                </>
              ) : (
                <span>Bắt đầu trích xuất</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
