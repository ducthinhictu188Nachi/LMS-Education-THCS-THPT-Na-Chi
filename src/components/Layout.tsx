import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { dataProvider } from '../core/provider';
import { LogOut, Home, BookOpen, Users, FileText, Bell, ChevronLeft, GraduationCap } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = dataProvider.getCurrentUser();

  const handleLogout = () => {
    dataProvider.logout();
    navigate('/');
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Đang tải...</div>;
  }

  const isAdmin = user.role === 'teacher';
  const menuItems = isAdmin ? [
    { name: 'Bảng điều khiển', path: '/admin', icon: <Home size={20} /> },
    { name: 'Quản lý Lớp học', path: '/admin/classes', icon: <Users size={20} /> },
    { name: 'Quản lý Học sinh', path: '/admin/students', icon: <GraduationCap size={20} /> },
    { name: 'Môn học & Chủ đề', path: '/admin/subjects', icon: <BookOpen size={20} /> },
    { name: 'Bài giảng & Bài tập', path: '/admin/lessons', icon: <FileText size={20} /> },
    { name: 'Ngân hàng câu hỏi', path: '/admin/question-bank', icon: <FileText size={20} /> },
    { name: 'Kiểm tra & Đánh giá', path: '/admin/tests', icon: <FileText size={20} /> },
    { name: 'Báo cáo & Thống kê', path: '/admin/reports', icon: <FileText size={20} /> },
    { name: 'Thông báo', path: '/admin/announcements', icon: <Bell size={20} /> },
  ] : [
    { name: 'Bảng điều khiển', path: '/app', icon: <Home size={20} /> },
    { name: 'Bài học của tôi', path: '/app/lessons', icon: <BookOpen size={20} /> },
    { name: 'Bài tập', path: '/app/assignments', icon: <FileText size={20} /> },
    { name: 'Kiểm tra', path: '/app/tests', icon: <FileText size={20} /> },
    { name: 'Thông báo', path: '/app/announcements', icon: <Bell size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-indigo-600 leading-tight">
            LMS Tin Học THPT
          </h1>
          <p className="text-xs text-gray-500 mt-1">Kết nối tri thức</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Giáo viên' : 'Học sinh'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Quay lại"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold">
              {menuItems.find(item => location.pathname === item.path || (item.path !== '/admin' && item.path !== '/app' && location.pathname.startsWith(item.path)))?.name || 'Chi tiết'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
