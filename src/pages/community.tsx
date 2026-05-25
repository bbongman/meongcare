import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  Bell,
  Map,
  Route,
  ChevronRight,
  Heart,
  MessageCircle,
  PawPrint,
  Plus,
} from "lucide-react";

interface FeedPost {
  id: number;
  nickname: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
}

const MOCK_POSTS: FeedPost[] = [
  {
    id: 1,
    nickname: "골든맘",
    time: "방금 전",
    content: "오늘 전주천에서 골든리트리버 만났어요! 너무 순해서 같이 산책했네요 ㅎㅎ",
    likes: 14,
    comments: 3,
    liked: false,
  },
  {
    id: 2,
    nickname: "연꽃산책러",
    time: "12분 전",
    content: "덕진공원 연꽃 지금 엄청 예뻐요. 강아지랑 산책하기 딱 좋아요",
    likes: 27,
    comments: 8,
    liked: true,
  },
  {
    id: 3,
    nickname: "말티즈집사",
    time: "31분 전",
    content: "우리 말티즈 처음으로 다른 강아지랑 친해졌어요! 산책 메이트 구해요~",
    likes: 9,
    comments: 5,
    liked: false,
  },
  {
    id: 4,
    nickname: "삼천하천러",
    time: "1시간 전",
    content: "삼천 하천길 추천합니다. 그늘도 많고 강아지 뛰어놀기 좋아요",
    likes: 33,
    comments: 11,
    liked: false,
  },
  {
    id: 5,
    nickname: "바람쐬러가자",
    time: "2시간 전",
    content: "내일 바람쐬는길 같이 걸으실 분? 오전 9시 자연생태박물관 앞",
    likes: 6,
    comments: 4,
    liked: false,
  },
];

export default function CommunityPage() {
  const [, navigate] = useLocation();
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <span className="font-bold text-xl text-gray-900 tracking-tight">노크</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">전주 덕진구</span>
          <button className="relative p-1">
            <Bell size={22} className="text-gray-500" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/walk")}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
          >
            <Map size={18} />
            지금 산책 중
          </button>
          <button
            onClick={() => navigate("/courses")}
            className="flex items-center justify-center gap-2 bg-white text-blue-500 font-semibold text-sm py-4 rounded-2xl border border-blue-200 active:scale-95 transition-transform"
          >
            <Route size={18} />
            코스 참가하기
          </button>
        </div>

        {/* 오늘의 산책 이벤트 배너 */}
        <div className="flex items-center justify-between bg-blue-500 rounded-2xl px-4 py-3.5">
          <div>
            <p className="text-xs text-blue-100 font-medium mb-0.5">오늘의 이벤트</p>
            <p className="text-sm text-white font-semibold">
              덕진공원 코스 이벤트 · 3/5명 참가 중
            </p>
          </div>
          <ChevronRight size={18} className="text-blue-200 flex-shrink-0" />
        </div>

        {/* 동네 피드 */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            동네 피드
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {posts.map((post) => (
              <div key={post.id} className="px-4 py-4">
                {/* 작성자 정보 */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <PawPrint size={15} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-800">{post.nickname}</span>
                    <span className="text-xs text-gray-400 ml-2">{post.time}</span>
                  </div>
                </div>

                {/* 본문 */}
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Heart
                      size={16}
                      className={post.liked ? "text-red-500 fill-red-500" : "text-gray-300"}
                    />
                    <span className={`text-xs font-medium ${post.liked ? "text-red-500" : "text-gray-400"}`}>
                      {post.likes}
                    </span>
                  </button>
                  <button className="flex items-center gap-1.5 active:scale-95 transition-transform">
                    <MessageCircle size={16} className="text-gray-300" />
                    <span className="text-xs font-medium text-gray-400">{post.comments}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 글쓰기 FAB */}
      <button
        className="fixed right-5 bottom-24 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-20"
        onClick={() => alert("글쓰기")}
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
    </Layout>
  );
}
