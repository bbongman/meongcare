export interface BreedEntry {
  name: string;
  aliases: string[];
  size: "소형" | "중형" | "대형";
}

export const DOG_BREEDS: BreedEntry[] = [
  { name: "말티즈", aliases: ["몰티즈", "maltese"], size: "소형" },
  { name: "토이푸들", aliases: ["토이 푸들", "toy poodle", "푸들(토이)"], size: "소형" },
  { name: "푸들", aliases: ["스탠다드 푸들", "미니어처 푸들", "poodle"], size: "중형" },
  { name: "포메라니안", aliases: ["포메", "폼", "pomeranian"], size: "소형" },
  { name: "치와와", aliases: ["chihuahua"], size: "소형" },
  { name: "시츄", aliases: ["시추", "shih tzu"], size: "소형" },
  { name: "요크셔테리어", aliases: ["요크셔 테리어", "요키", "yorkshire terrier"], size: "소형" },
  { name: "비숑 프리제", aliases: ["비숑", "비숑프리제", "비샹", "bichon frise"], size: "소형" },
  { name: "닥스훈트", aliases: ["닥스훈드", "dachshund"], size: "소형" },
  { name: "스피츠", aliases: ["재패니즈 스피츠", "japanese spitz"], size: "소형" },
  { name: "슈나우저", aliases: ["미니어처 슈나우저", "schnauzer"], size: "소형" },
  { name: "페키니즈", aliases: ["pekingese"], size: "소형" },
  { name: "파피용", aliases: ["papillon"], size: "소형" },
  { name: "비글", aliases: ["beagle"], size: "중형" },
  { name: "웰시코기", aliases: ["코기", "웰시 코기", "welsh corgi"], size: "중형" },
  { name: "프렌치 불독", aliases: ["프렌치불독", "프불", "french bulldog"], size: "중형" },
  { name: "불독", aliases: ["잉글리시 불독", "english bulldog"], size: "중형" },
  { name: "보더콜리", aliases: ["보더 콜리", "border collie"], size: "중형" },
  { name: "코카스파니엘", aliases: ["코카 스파니엘", "cocker spaniel"], size: "중형" },
  { name: "진돗개", aliases: ["진도", "한국 진돗개", "jindo"], size: "중형" },
  { name: "풍산개", aliases: ["풍산"], size: "중형" },
  { name: "사모예드", aliases: ["samoyed"], size: "대형" },
  { name: "골든리트리버", aliases: ["골든 리트리버", "골리", "golden retriever"], size: "대형" },
  { name: "래브라도리트리버", aliases: ["래브라도 리트리버", "라브라도", "래브라도", "labrador"], size: "대형" },
  { name: "저먼 셰퍼드", aliases: ["셰퍼드", "독일 셰퍼드", "german shepherd"], size: "대형" },
  { name: "시베리안 허스키", aliases: ["허스키", "siberian husky"], size: "대형" },
  { name: "도베르만", aliases: ["도베르만 핀셔", "doberman"], size: "대형" },
  { name: "로트와일러", aliases: ["rottweiler"], size: "대형" },
  { name: "그레이트 데인", aliases: ["great dane"], size: "대형" },
  { name: "버니즈 마운틴 독", aliases: ["버니즈", "bernese"], size: "대형" },
  // 인기 믹스견
  { name: "말티푸", aliases: ["maltipoo"], size: "소형" },
  { name: "말티숑", aliases: ["maltichon"], size: "소형" },
  { name: "치푸", aliases: ["chipoo", "치와푸"], size: "소형" },
  { name: "시푸", aliases: ["shihpoo", "시츄푸들"], size: "소형" },
  { name: "폼피츠", aliases: ["pomspitz"], size: "소형" },
  { name: "코카푸", aliases: ["cockapoo"], size: "중형" },
  { name: "골든두들", aliases: ["goldendoodle", "골든 두들"], size: "대형" },
  { name: "래브라두들", aliases: ["labradoodle", "래브라 두들"], size: "대형" },
  { name: "폼스키", aliases: ["pomsky"], size: "중형" },
  { name: "믹스견", aliases: ["믹스", "잡종", "혼종", "mixed"], size: "중형" },
];

export function searchBreeds(query: string): BreedEntry[] {
  if (!query.trim()) return DOG_BREEDS;
  const q = query.trim().toLowerCase();
  return DOG_BREEDS.filter((b) =>
    b.name.toLowerCase().includes(q) ||
    b.aliases.some((a) => a.toLowerCase().includes(q))
  );
}
