export type Role = 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: Role;
  classId?: string; // For students
  dob?: string; // Ngày sinh
}

export interface Subject {
  id: string;
  name: string;
  description: string;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
  teacherName?: string; // Tên GVCN
  academicYear?: string; // Niên khóa
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  order: number;
}

export interface InteractiveBlock {
  id: string;
  type: 'text' | 'video' | 'quiz' | 'code' | 'image';
  data: {
    content?: string;
    url?: string;
    language?: string; // for code
    question?: string; // for quiz
    options?: string[]; // for quiz
    correctAnswer?: string; // for quiz
    caption?: string; // for image/video
  };
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  content: string;
  videoUrl?: string;
  pptUrl?: string;
  order: number;
  status: 'draft' | 'published';
  grade: string;
  classId?: string;
  interactiveContent?: InteractiveBlock[];
}

export interface Assignment {
  id: string;
  lessonId?: string;
  title: string;
  description: string;
  dueDate: string;
  grade?: string;
  classId?: string;
  subjectId?: string;
  topicId?: string;
  studentIds?: string[];
  attachments?: string[];
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
export type QuestionDifficulty = 'recognition' | 'understanding' | 'application';

export interface SubQuestion {
  id: string;
  content: string;
  difficulty: QuestionDifficulty;
  correctAnswer: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  difficulty?: QuestionDifficulty;
  content: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string | boolean | Record<string, boolean>;
  subQuestions?: SubQuestion[]; // For true_false
  points: number;
  explanation?: string;
}

export interface BankQuestion extends Question {
  subjectId?: string;
  topicId?: string;
  createdAt: string;
}

export interface Test {
  id: string;
  title: string;
  topicId?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  questions: Question[];
  assignedTo: {
    type: 'grade' | 'class';
    ids: string[]; // grade numbers or class ids
  };
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId?: string;
  testId?: string;
  studentId: string;
  content: string;
  fileName?: string;
  fileUrl?: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}

export interface Progress {
  id: string;
  studentId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface Announcement {
  id: string;
  target: string; // 'all', 'students', or classId
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
}
