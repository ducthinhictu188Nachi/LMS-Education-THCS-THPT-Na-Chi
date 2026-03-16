import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataProvider } from '../../core/provider';
import { Test, Submission } from '../../core/types';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const TestResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const currentUser = dataProvider.getCurrentUser();
      if (!currentUser) return;

      try {
        const testData = await dataProvider.getOne<Test>('tests', id);
        const submissions = await dataProvider.getList<Submission>('submissions', { 
          testId: id, 
          studentId: currentUser.id 
        });
        
        setTest(testData);
        if (submissions.length > 0) {
          setSubmission(submissions[0]);
          setAnswers(JSON.parse(submissions[0].content));
        }
      } catch (error) {
        console.error("Error fetching result", error);
      }
    };
    fetchData();
  }, [id]);

  if (!test || !submission) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;

  const isFullyGraded = !test.questions.some(q => q.type === 'essay' || q.type === 'short_answer');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/app/tests')}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <ArrowLeft size={20} /> Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Kết quả bài kiểm tra</h2>
          <p className="text-indigo-100 mb-6">{test.title}</p>
          
          <div className="inline-block bg-white text-indigo-900 rounded-2xl p-6 shadow-lg">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Điểm số</p>
            <div className="text-5xl font-black">
              {submission.score !== undefined ? submission.score : '?'} <span className="text-2xl text-gray-400">/ 10</span>
            </div>
            {!isFullyGraded && submission.score === undefined && (
              <p className="text-xs text-amber-600 mt-2 flex items-center justify-center gap-1">
                <AlertCircle size={14} /> Chờ giáo viên chấm tự luận
              </p>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8">
          <h3 className="text-xl font-bold text-gray-900 border-b pb-4">Chi tiết bài làm</h3>
          
          {test.questions.map((q, idx) => {
            const studentAnswer = answers[q.id];
            const isAIGraded = (q.type === 'short_answer' || q.type === 'essay') && answers[`${q.id}_score`] !== undefined;
            const aiScore = answers[`${q.id}_score`];
            const aiFeedback = answers[`${q.id}_feedback`];
            
            let isCorrect: boolean | null = null;
            let tfScore = 0;
            const questionMaxPoints = q.type === 'true_false' ? 1.0 : q.points;

            if (q.type === 'multiple_choice') {
              isCorrect = studentAnswer === q.correctAnswer;
            } else if (q.type === 'true_false' && q.subQuestions) {
              let correctCount = 0;
              const studentAns = studentAnswer || {};
              q.subQuestions.forEach(sq => {
                if (studentAns[sq.id] === sq.correctAnswer) {
                  correctCount++;
                }
              });
              
              if (correctCount === q.subQuestions.length) isCorrect = true;
              else if (correctCount > 0) isCorrect = null; // Partial correct
              else isCorrect = false;

              if (correctCount === 1) tfScore = 0.1;
              else if (correctCount === 2) tfScore = 0.25;
              else if (correctCount === 3) tfScore = 0.5;
              else if (correctCount === 4) tfScore = 1.0;
              
            } else if (isAIGraded) {
              isCorrect = aiScore === questionMaxPoints ? true : (aiScore > 0 ? null : false); // null for partial credit
            }

            return (
              <div key={q.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wider">
                      {q.type === 'multiple_choice' ? 'Phần I: Trắc nghiệm nhiều lựa chọn' : 
                       q.type === 'true_false' ? 'Phần II: Đúng/Sai' : 
                       q.type === 'short_answer' ? 'Phần III: Trả lời ngắn' : 'Phần IV: Tự luận'}
                      {q.difficulty && ` - Mức độ: ${
                        q.difficulty === 'recognition' ? 'Nhận biết' :
                        q.difficulty === 'understanding' ? 'Thông hiểu' : 'Vận dụng'
                      }`}
                    </div>
                    <h4 className="font-medium text-gray-900">
                      <span className="font-bold mr-2">Câu {idx + 1}:</span>
                      {q.content}
                    </h4>
                  </div>
                  <div className="shrink-0 ml-4 flex flex-col items-end">
                    {isCorrect === true && <span className="flex items-center gap-1 text-emerald-600 font-medium text-sm"><CheckCircle size={18} /> Đúng</span>}
                    {isCorrect === false && <span className="flex items-center gap-1 text-red-600 font-medium text-sm"><XCircle size={18} /> Sai</span>}
                    {isCorrect === null && !isAIGraded && q.type !== 'true_false' && <span className="flex items-center gap-1 text-amber-600 font-medium text-sm"><AlertCircle size={18} /> Chờ chấm</span>}
                    {isCorrect === null && (isAIGraded || q.type === 'true_false') && <span className="flex items-center gap-1 text-amber-600 font-medium text-sm"><AlertCircle size={18} /> Đúng một phần</span>}
                    
                    {isAIGraded && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1">
                        {aiScore} / {questionMaxPoints} điểm
                      </span>
                    )}
                    {q.type === 'multiple_choice' && (
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1">
                         {isCorrect ? questionMaxPoints : 0} / {questionMaxPoints} điểm
                       </span>
                    )}
                    {q.type === 'true_false' && (
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1">
                         {tfScore} / {questionMaxPoints} điểm
                       </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {q.type === 'true_false' && q.subQuestions ? (
                    <div className="space-y-2 mt-4">
                      {q.subQuestions.map(sq => {
                        const sAns = (studentAnswer || {})[sq.id];
                        const isSubCorrect = sAns === sq.correctAnswer;
                        return (
                          <div key={sq.id} className="p-3 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <span className="font-bold mr-2">{sq.id})</span>
                              <span className="text-gray-800">{sq.content}</span>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Bạn chọn:</span>
                                <span className={`font-medium ${
                                  sAns !== undefined ? (isSubCorrect ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400 italic'
                                }`}>
                                  {sAns !== undefined ? (sAns ? 'Đúng' : 'Sai') : 'Không chọn'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Đáp án:</span>
                                <span className="font-medium text-emerald-600">
                                  {sq.correctAnswer ? 'Đúng' : 'Sai'}
                                </span>
                              </div>
                              {isSubCorrect ? <CheckCircle size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-red-500" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm">
                        <span className="text-gray-500">Câu trả lời của bạn: </span>
                        <span className={`font-medium ${
                          isCorrect === true ? 'text-emerald-700' : 
                          isCorrect === false ? 'text-red-700' : 'text-gray-900'
                        }`}>
                          {studentAnswer !== undefined 
                            ? studentAnswer 
                            : <span className="italic text-gray-400">Không trả lời</span>}
                        </span>
                      </div>

                      {(isCorrect === false || isCorrect === true || isAIGraded) && q.correctAnswer && (
                        <div className="text-sm">
                          <span className="text-gray-500">Đáp án đúng / Hướng dẫn chấm: </span>
                          <span className="font-medium text-emerald-700">
                            {q.correctAnswer}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {isAIGraded && aiFeedback && (
                    <div className="text-sm mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <span className="text-blue-800 font-semibold block mb-1">Nhận xét từ AI:</span>
                      <span className="text-blue-700">{aiFeedback}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
