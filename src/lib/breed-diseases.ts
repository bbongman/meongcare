import { DOG_BREEDS } from "@/lib/dog-breeds";

export interface BreedDiseaseInfo {
  diseases: string[];
  tip: string;
}

export const BREED_DISEASES: Record<string, BreedDiseaseInfo> = {
  "말티즈": { diseases: ["슬개골 탈구", "심장판막 질환", "기관 허탈"], tip: "기관 허탈 예방을 위해 목줄보다 하네스를 권장해요." },
  "토이푸들": { diseases: ["슬개골 탈구", "진행성 망막 위축", "저혈당"], tip: "소형견은 저혈당에 취약하니 하루 2~3회 나눠 급여하세요." },
  "푸들": { diseases: ["슬개골 탈구", "진행성 망막 위축", "애디슨병"], tip: "슬개골 탈구 예방을 위해 미끄러운 바닥과 높은 곳에서 점프를 피하세요." },
  "포메라니안": { diseases: ["슬개골 탈구", "기관 허탈", "탈모증"], tip: "이중모 관리가 중요해요. 정기적 브러싱을 해주세요." },
  "치와와": { diseases: ["슬개골 탈구", "저혈당", "수두증"], tip: "추위에 약하고 저혈당에 취약하니 보온과 식사 관리를 챙겨주세요." },
  "시츄": { diseases: ["안구 건조증", "호흡기 질환", "디스크"], tip: "단두종이라 더운 날 과도한 운동을 피하세요." },
  "요크셔테리어": { diseases: ["슬개골 탈구", "기관 허탈", "저혈당"], tip: "소형견이라 저혈당과 치아 건강에 주의하세요." },
  "비숑 프리제": { diseases: ["알러지", "슬개골 탈구", "방광 결석"], tip: "피부 알러지에 주의하고, 정기적인 그루밍이 필요해요." },
  "닥스훈트": { diseases: ["디스크", "비만", "당뇨"], tip: "디스크 위험이 매우 높아요. 계단 오르내리기를 최소화하세요." },
  "스피츠": { diseases: ["슬개골 탈구", "기관 허탈", "탈모증"], tip: "이중모 관리와 슬개골 건강에 신경 쓰세요." },
  "슈나우저": { diseases: ["당뇨", "췌장염", "고지혈증"], tip: "지방이 높은 음식을 피하고, 정기 혈액검사를 권장해요." },
  "비글": { diseases: ["간질", "디스크", "비만"], tip: "식탐이 강해 비만이 되기 쉬워요. 음식 관리를 철저히 해주세요." },
  "웰시코기": { diseases: ["디스크", "고관절 이형성", "비만"], tip: "허리가 긴 체형이라 디스크에 취약해요. 계단과 점프를 줄여주세요." },
  "프렌치 불독": { diseases: ["호흡기 질환", "피부염", "척추 질환"], tip: "단두종이라 더위에 매우 약해요. 여름철 실외 활동을 최소화하세요." },
  "불독": { diseases: ["호흡기 질환", "피부염", "고관절 이형성"], tip: "더위에 약하고 피부 주름 관리가 중요해요." },
  "진돗개": { diseases: ["갑상선 질환", "피부 알러지", "관절 질환"], tip: "활동량이 많아 충분한 운동이 필요하고, 피부 건강을 챙겨주세요." },
  "사모예드": { diseases: ["고관절 이형성", "당뇨", "녹내장"], tip: "이중모 관리가 중요하고, 더위에 약해요." },
  "골든리트리버": { diseases: ["고관절 이형성", "림프종", "피부 알러지"], tip: "대형견으로 고관절 건강이 중요해요. 체중 관리를 꼭 해주세요." },
  "래브라도리트리버": { diseases: ["고관절 이형성", "비만", "관절염"], tip: "식탐이 강해 비만에 취약해요. 사료량을 꼭 지켜주세요." },
  "저먼 셰퍼드": { diseases: ["고관절 이형성", "퇴행성 척수증", "췌장 기능 부전"], tip: "대형견으로 관절 건강이 핵심이에요. 적정 체중을 유지하세요." },
  "시베리안 허스키": { diseases: ["백내장", "고관절 이형성", "아연결핍 피부증"], tip: "이중모로 더위에 약해요. 여름철 실내 온도 관리를 해주세요." },
};

// 믹스견 → 부모 견종 매핑
const MIX_PARENTS: Record<string, string[]> = {
  "말티푸": ["말티즈", "토이푸들"],
  "말티숑": ["말티즈", "비숑 프리제"],
  "치푸": ["치와와", "토이푸들"],
  "시푸": ["시츄", "토이푸들"],
  "코카푸": ["푸들", "푸들"],
  "골든두들": ["골든리트리버", "푸들"],
  "래브라두들": ["래브라도리트리버", "푸들"],
  "폼스키": ["포메라니안", "시베리안 허스키"],
};

function combineDiseases(parents: string[]): BreedDiseaseInfo | null {
  const allDiseases: string[] = [];
  const tips: string[] = [];
  for (const p of parents) {
    const info = BREED_DISEASES[p];
    if (info) {
      for (const d of info.diseases) {
        if (!allDiseases.includes(d)) allDiseases.push(d);
      }
      tips.push(info.tip);
    }
  }
  if (allDiseases.length === 0) return null;
  return {
    diseases: allDiseases.slice(0, 4),
    tip: `${parents.join(" + ")} 믹스로 양쪽 특성을 모두 주의하세요. ${tips[0]}`,
  };
}

export function getBreedDiseases(breed: string): BreedDiseaseInfo | null {
  const q = breed.trim();
  if (BREED_DISEASES[q]) return BREED_DISEASES[q];

  // DOG_BREEDS의 aliases를 통해 canonical name으로 매핑
  for (const entry of DOG_BREEDS) {
    if (entry.name === q || entry.aliases.some((a) => a.toLowerCase() === q.toLowerCase())) {
      if (BREED_DISEASES[entry.name]) return BREED_DISEASES[entry.name];
      if (MIX_PARENTS[entry.name]) return combineDiseases(MIX_PARENTS[entry.name]);
    }
  }

  // 믹스견 직접 매칭
  if (MIX_PARENTS[q]) return combineDiseases(MIX_PARENTS[q]);

  // 부분 매칭 fallback
  const match = Object.keys(BREED_DISEASES).find((k) => q.includes(k) || k.includes(q));
  if (match) return BREED_DISEASES[match];

  // 이름에 부모 견종이 포함된 경우 자동 조합 (예: "폼푸", "시츄믹스")
  const foundParents = Object.keys(BREED_DISEASES).filter((k) => q.includes(k.replace(/ /g, "")) || q.includes(k));
  if (foundParents.length > 0) return combineDiseases(foundParents);

  return null;
}
