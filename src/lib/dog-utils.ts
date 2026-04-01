import type { Dog } from "@/hooks/use-dogs";

export function getDisplayAge(dog: Dog): number {
  if (dog.birthday) {
    const birthDate = new Date(dog.birthday + "T00:00:00");
    if (!isNaN(birthDate.getTime())) {
      return Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  return dog.age;
}

export function getBirthdayDiff(birthday: string): number | null {
  const parts = birthday.split("-");
  if (parts.length < 3) return null;
  const [, month, day] = parts;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();
  let bday = new Date(`${thisYear}-${month}-${day}T00:00:00`);
  let diff = Math.round((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    bday = new Date(`${thisYear + 1}-${month}-${day}T00:00:00`);
    diff = Math.round((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return diff;
}

export function toHumanAge(dogAge: number, weight?: number): number {
  const w = weight ?? 0;
  const extra = w >= 25 ? 7 : w >= 10 ? 5 : 4;
  if (dogAge <= 0) return 0;
  if (dogAge === 1) return 15;
  if (dogAge === 2) return 24;
  return 24 + (dogAge - 2) * extra;
}

export function getHealthTip(dog: Dog): { emoji: string; title: string; body: string } {
  const { breed, weight } = dog;
  const age = getDisplayAge(dog);
  const w = weight || 0;

  const weightTip = w > 0
    ? w < 4 ? `${w}kg 소형견은 저혈당에 취약하니 하루 2~3회 소량씩 나눠 급여하세요.`
    : w < 10 ? `${w}kg 중소형견은 하루 사료량 ${Math.round(w * 20)}~${Math.round(w * 25)}g 정도가 적당해요.`
    : w < 25 ? `${w}kg 중형견은 하루 사료량 ${Math.round(w * 15)}~${Math.round(w * 20)}g, 관절 건강에 신경 쓰세요.`
    : `${w}kg 대형견은 하루 사료량 ${Math.round(w * 12)}~${Math.round(w * 15)}g, 고관절과 심장 관리가 중요해요.`
    : "";

  if (age <= 1) return {
    emoji: "🍼",
    title: `퍼피 시기 · ${breed}`,
    body: `면역력이 약해요. 기초 예방접종(홍역·파보바이러스)을 꼭 완료하세요.${weightTip ? ` ${weightTip}` : " 성장기라 사료량을 점차 늘려주세요."}`,
  };
  if (age <= 3) return {
    emoji: "⚡",
    title: `활발한 청년기 · ${breed}`,
    body: `에너지가 넘치는 시기예요. 하루 30분 이상 산책이 필요해요.${weightTip ? ` ${weightTip}` : ""}`,
  };
  if (age <= 7) return {
    emoji: "💪",
    title: `건강한 성년기 · ${breed}`,
    body: `1년에 한 번 건강검진을 권장해요.${weightTip ? ` ${weightTip}` : " 치석이 쌓이기 쉬우니 주 2~3회 양치질이 중요해요."}`,
  };
  if (age <= 10) return {
    emoji: "🏥",
    title: `시니어 진입기 · ${breed}`,
    body: `심장·관절 질환을 주의하세요. 6개월마다 혈액검사를 권장해요.${weightTip ? ` ${weightTip}` : ""}`,
  };
  return {
    emoji: "❤️",
    title: `노령견 케어 · ${breed}`,
    body: `계단과 점프를 줄이고 관절 보조제를 고려하세요.${weightTip ? ` ${weightTip}` : " 식사량 변화나 음수량 증가에 주의하세요."}`,
  };
}
