import { Dialog, DialogContent } from "@/components/ui/dialog";

export function InstallGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl p-0 gap-0">
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-4xl shadow-inner">🐾</div>
            <div>
              <h2 className="text-lg font-bold text-foreground">앱으로 설치하면 더 편해요!</h2>
              <p className="text-sm text-muted-foreground mt-1">홈 화면에 추가하면 앱처럼 바로 실행할 수 있어요</p>
            </div>
          </div>

          {isStandalone ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-green-700">이미 앱으로 설치되어 있어요!</p>
            </div>
          ) : isIos ? (
            <div className="bg-secondary/60 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-foreground">iPhone / iPad</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  Safari 하단 <span className="text-base">⬆</span> 공유 버튼 탭
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <strong className="text-foreground">"홈 화면에 추가"</strong> 선택
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  우측 상단 <strong className="text-foreground">"추가"</strong> 탭
                </li>
              </ol>
            </div>
          ) : (
            <div className="bg-secondary/60 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-foreground">Android / Chrome</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  브라우저 우측 상단 <strong className="text-foreground">⋮</strong> 메뉴 탭
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <strong className="text-foreground">"홈 화면에 추가"</strong> 또는 <strong className="text-foreground">"앱 설치"</strong> 선택
                </li>
              </ol>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            확인했어요
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
