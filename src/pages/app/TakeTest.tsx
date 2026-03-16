import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataProvider } from '../../core/provider';
import { Test, Question } from '../../core/types';
import { Modal } from '../../components/Modal';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const parseTruncatedJSON = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e: any) {
    if (e.message.includes('Unterminated string') || e.message.includes('Unexpected end of JSON input') || e.message.includes('Expected')) {
      let fixedString = jsonString;
      while (fixedString.length > 0) {
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

export const TakeTest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) return;
      try {
        const testData = await dataProvider.getOne<Test>('tests', id);
        setTest(testData);
        
        // Initialize timer
        setTimeLeft(testData.durationMinutes * 60);
      } catch (error) {
        console.error("Test not found", error);
        navigate('/app/tests');
      }
    };
    fetchTest();
  }, [id, navigate]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitting) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && test && !isSubmitting) {
      handleSubmit(); // Auto submit when time is up
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isSubmitting, test]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: any, subQuestionId?: string) => {
    if (subQuestionId) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || {}),
          [subQuestionId]: value
        }
      }));
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handlePreSubmit = () => {
    let isComplete = true;
    for (const q of test!.questions) {
      if (q.type === 'true_false' && q.subQuestions) {
        const ans = answers[q.id] || {};
        if (Object.keys(ans).length < q.subQuestions.length) {
          isComplete = false;
          break;
        }
      } else if (answers[q.id] === undefined || answers[q.id] === '') {
        isComplete = false;
        break;
      }
    }

    if (timeLeft > 0 && !isComplete) {
      setShowConfirmSubmit(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!test || isSubmitting) return;
    
    setShowConfirmSubmit(false);
    
    const currentUser = dataProvider.getCurrentUser();
    if (!currentUser) return;

    setIsSubmitting(true);
    
    let totalScore = 0;
    let maxScore = 0;
    
    // Auto-grade multiple choice and true/false immediately
    test.questions.forEach(q => {
      const questionMaxPoints = q.type === 'true_false' ? 1.0 : q.points;
      maxScore += questionMaxPoints;
      if (q.type === 'multiple_choice') {
        if (answers[q.id] === q.correctAnswer) {
          totalScore += questionMaxPoints;
        }
      } else if (q.type === 'true_false' && q.subQuestions) {
        let correctCount = 0;
        const studentAns = answers[q.id] || {};
        q.subQuestions.forEach(sq => {
          if (studentAns[sq.id] === sq.correctAnswer) {
            correctCount++;
          }
        });
        
        let score = 0;
        if (correctCount === 1) score = 0.1;
        else if (correctCount === 2) score = 0.25;
        else if (correctCount === 3) score = 0.5;
        else if (correctCount === 4) score = 1.0;
        
        totalScore += score;
      }
    });

    // Grade short_answer and essay using AI if they have a correctAnswer (grading guide)
    const questionsToGradeByAI = test.questions.filter(q => 
      (q.type === 'short_answer' || q.type === 'essay') && 
      q.correctAnswer && 
      answers[q.id]
    );

    if (questionsToGradeByAI.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const gradingPrompt = `Bạn là một giáo viên chấm bài thi. Hãy chấm điểm các câu trả lời của học sinh dựa trên câu hỏi và đáp án/hướng dẫn chấm.
        
        Danh sách các câu hỏi cần chấm:
        ${questionsToGradeByAI.map((q, idx) => `
        Câu ${idx + 1}:
        - ID: ${q.id}
        - Nội dung câu hỏi: ${q.content}
        - Đáp án/Hướng dẫn chấm: ${q.correctAnswer}
        - Điểm tối đa: ${q.points}
        - Câu trả lời của học sinh: ${answers[q.id]}
        `).join('\n')}
        
        Trả về mảng JSON chứa kết quả chấm điểm cho từng câu. Mỗi phần tử gồm:
        - id: ID của câu hỏi
        - score: Điểm số đạt được (từ 0 đến điểm tối đa, có thể cho điểm lẻ như 0.25, 0.5)
        - feedback: Nhận xét ngắn gọn về câu trả lời.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: gradingPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  feedback: { type: Type.STRING }
                },
                required: ["id", "score", "feedback"]
              }
            }
          }
        });

        const gradingResults = parseTruncatedJSON(response.text);
        
        // Add AI scores to totalScore
        gradingResults.forEach((result: any) => {
          totalScore += result.score;
          // Store feedback in answers object for later display if needed
          answers[`${result.id}_feedback`] = result.feedback;
          answers[`${result.id}_score`] = result.score;
        });

      } catch (error) {
        console.error("Error grading with AI:", error);
        // Fallback: if AI grading fails, we just don't add points for these questions
        // In a real app, we might mark them as "pending manual review"
      }
    }

    // Scale to 10 point system if maxScore > 0
    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 10 * 10) / 10 : 0;

    try {
      await dataProvider.submitAssignment({
        testId: test.id,
        studentId: currentUser.id,
        content: JSON.stringify(answers),
        score: finalScore
      });
      
      navigate(`/app/tests/${test.id}/result`);
    } catch (error) {
      console.error("Error submitting test", error);
      alert("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  if (!test) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;

  const currentQuestion = test.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === test.questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header / Timer */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-4 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{test.title}</h2>
          <p className="text-sm text-gray-500">Câu {currentQuestionIndex + 1} / {test.questions.length}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold ${
          timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'
        }`}>
          <Clock size={20} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question Navigation Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {test.questions.map((q, idx) => {
            let isAnswered = false;
            if (q.type === 'true_false' && q.subQuestions) {
              const ans = answers[q.id] || {};
              isAnswered = Object.keys(ans).length === q.subQuestions.length;
            } else {
              isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  currentQuestionIndex === idx 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-200' 
                    : isAnswered
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Question Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wider">
                {currentQuestion.type === 'multiple_choice' ? 'Phần I: Trắc nghiệm nhiều lựa chọn' : 
                 currentQuestion.type === 'true_false' ? 'Phần II: Đúng/Sai' : 
                 currentQuestion.type === 'short_answer' ? 'Phần III: Trả lời ngắn' : 'Phần IV: Tự luận'}
                {currentQuestion.difficulty && ` - Mức độ: ${
                  currentQuestion.difficulty === 'recognition' ? 'Nhận biết' :
                  currentQuestion.difficulty === 'understanding' ? 'Thông hiểu' : 'Vận dụng'
                }`}
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                <span className="font-bold mr-2">Câu {currentQuestionIndex + 1}:</span>
                {currentQuestion.content}
              </h3>
            </div>
            <span className="shrink-0 text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              {currentQuestion.type === 'true_false' ? 1 : currentQuestion.points} điểm
            </span>
          </div>

          {/* Answer Inputs based on type */}
          <div className="mt-6 space-y-3">
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map((opt, idx) => (
              <label 
                key={idx} 
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  answers[currentQuestion.id] === opt 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="radio" 
                  name={`question-${currentQuestion.id}`}
                  value={opt}
                  checked={answers[currentQuestion.id] === opt}
                  onChange={() => handleAnswerChange(currentQuestion.id, opt)}
                  className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900">{opt}</span>
              </label>
            ))}

            {currentQuestion.type === 'true_false' && currentQuestion.subQuestions && (
              <div className="space-y-4">
                {currentQuestion.subQuestions.map((sq, sqIdx) => (
                  <div key={sq.id || sqIdx} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-bold mr-2">{sq.id})</span>
                      <span className="text-gray-900">{sq.content}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        answers[currentQuestion.id]?.[sq.id] === true
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}>
                        <input 
                          type="radio" 
                          name={`question-${currentQuestion.id}-sub-${sqIdx}`}
                          value="true"
                          checked={answers[currentQuestion.id]?.[sq.id] === true}
                          onChange={() => handleAnswerChange(currentQuestion.id, true, sq.id)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        Đúng
                      </label>
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        answers[currentQuestion.id]?.[sq.id] === false
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}>
                        <input 
                          type="radio" 
                          name={`question-${currentQuestion.id}-sub-${sqIdx}`}
                          value="false"
                          checked={answers[currentQuestion.id]?.[sq.id] === false}
                          onChange={() => handleAnswerChange(currentQuestion.id, false, sq.id)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        Sai
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <input 
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Nhập câu trả lời ngắn của bạn..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}

            {currentQuestion.type === 'essay' && (
              <textarea 
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Nhập câu trả lời tự luận của bạn..."
                rows={6}
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-auto pt-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} /> Câu trước
          </button>

          {!isLastQuestion ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Câu tiếp <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handlePreSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 font-bold transition-colors"
            >
              <CheckCircle size={20} /> {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Xác nhận nộp bài"
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <p>Bạn chưa trả lời hết các câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ không?</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmSubmit(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Tiếp tục làm bài
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Nộp bài
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
