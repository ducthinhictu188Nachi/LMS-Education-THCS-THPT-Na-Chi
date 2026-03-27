import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { dataProvider } from '../../core/provider';
import { User } from '../../core/types';
import { Trophy, Medal, Star, TrendingUp, Award, Zap } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = dataProvider.getCurrentUser();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await dataProvider.getLeaderboard();
        setStudents(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  const topThree = students.slice(0, 3);
  const rest = students.slice(3);

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
          <Trophy className="text-amber-500" size={32} />
          Bảng Xếp Hạng Học Tập
        </h2>
        <p className="text-gray-500">Vinh danh những học sinh tích cực nhất</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10 px-4 max-w-4xl mx-auto">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="order-2 md:order-1 flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-slate-600">
                {topThree[1].fullName.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-white shadow-md">
                <Medal size={16} />
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="font-bold text-gray-900 truncate max-w-[150px]">{topThree[1].fullName}</p>
              <p className="text-xs text-indigo-600 font-bold">{topThree[1].xp || 0} XP</p>
            </div>
            <div className="w-full h-24 bg-slate-100 rounded-t-3xl flex items-center justify-center text-4xl font-black text-slate-300">
              2
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="order-1 md:order-2 flex flex-col items-center"
          >
            <div className="relative mb-4 scale-125">
              <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-400 shadow-xl flex items-center justify-center text-3xl font-bold text-amber-700">
                {topThree[0].fullName.charAt(0)}
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                <Trophy size={32} fill="currentColor" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <Star size={20} fill="currentColor" />
              </div>
            </div>
            <div className="text-center mb-6">
              <p className="font-black text-xl text-gray-900 truncate max-w-[200px]">{topThree[0].fullName}</p>
              <p className="text-sm text-indigo-600 font-black">{topThree[0].xp || 0} XP</p>
            </div>
            <div className="w-full h-36 bg-amber-500 rounded-t-[2.5rem] flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-amber-200">
              1
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="order-3 md:order-3 flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-orange-700">
                {topThree[2].fullName.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white shadow-md">
                <Medal size={16} />
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="font-bold text-gray-900 truncate max-w-[150px]">{topThree[2].fullName}</p>
              <p className="text-xs text-indigo-600 font-bold">{topThree[2].xp || 0} XP</p>
            </div>
            <div className="w-full h-16 bg-orange-50 rounded-t-3xl flex items-center justify-center text-4xl font-black text-orange-200">
              3
            </div>
          </motion.div>
        )}
      </div>

      {/* Rest of the list */}
      <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Hạng</span>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex-1 ml-12">Học sinh</span>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Kinh nghiệm (XP)</span>
        </div>
        <div className="divide-y divide-gray-50">
          {rest.map((student, idx) => {
            const isMe = student.id === currentUser?.id;
            return (
              <motion.div 
                key={student.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className={`p-4 flex items-center gap-4 transition-colors ${isMe ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="w-8 text-center font-black text-gray-400">
                  {idx + 4}
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shrink-0">
                  {student.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${isMe ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {student.fullName}
                    {isMe && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">Bạn</span>}
                  </p>
                  <p className="text-xs text-gray-400">Cấp độ {student.level || 1}</p>
                </div>
                <div className="flex items-center gap-2 font-black text-indigo-600">
                  <Zap size={14} className="text-amber-500" />
                  {student.xp || 0}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* User Stats Card */}
      {currentUser && (
        <div className="max-w-4xl mx-auto bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-black">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-black">{currentUser.fullName}</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-bold">
                  <Star size={14} className="text-amber-300" />
                  Cấp độ {currentUser.level || 1}
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-bold">
                  <Zap size={14} className="text-amber-300" />
                  {currentUser.xp || 0} XP
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Thứ hạng của bạn</p>
            <div className="text-5xl font-black flex items-baseline gap-2">
              #{students.findIndex(s => s.id === currentUser.id) + 1}
              <span className="text-lg text-indigo-300">/ {students.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
