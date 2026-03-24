import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "10mb" }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


app.post("/api/analyze", async (req, res) => {
  const { dog, symptoms } = req.body;

  if (!symptoms?.trim()) {
    return res.status(400).json({ error: "증상을 입력해주세요." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요." });
  }

  try {
    const dogInfo = dog
      ? `강아지 정보:\n- 이름: ${dog.name}\n- 견종: ${dog.breed}\n- 나이: ${dog.age}살\n- 체중: ${dog.weight}kg\n- 성별: ${dog.gender === "male" ? "수컷" : "암컷"}\n- 중성화: ${dog.neutered ? "완료" : "미완료"}\n\n`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `당신은 경험 많은 반려견 전문 수의사 AI입니다.
보호자가 입력한 증상과 강아지 정보를 바탕으로 응급도를 정확히 판단해주세요.

판단 시 반드시 고려할 사항:
- 견종별 유전적 취약점 (말티즈·포메라니안→심장, 닥스훈트·코기→디스크, 불독→호흡기 등)
- 나이 (어린 강아지→파보·홍역 취약, 노령견→심장·신장·종양 위험)
- 성별·중성화 여부 (중성화 안 한 암컷→자궁축농증, 유선종양)
- 증상 지속 시간과 진행 속도 (갑작스러운 증상일수록 응급 가능성 높음)
- 복합 증상 시 가장 위험한 가능성을 우선 판단
- 생명을 위협하는 징후 우선: 호흡곤란, 기절, 혈변+구토 동반, 복부 팽만, 마비, 경련`,
      messages: [
        {
          role: "user",
          content: `${dogInfo}증상: ${symptoms}

다음 JSON 형식으로만 응답해주세요 (추가 설명 없이):
{
  "urgency": "home" 또는 "tomorrow" 또는 "now",
  "summary": "증상 요약 및 의심 질환 (1-2문장)",
  "advice": "구체적인 케어 방법 또는 주의사항",
  "nextSteps": ["단계1", "단계2", "단계3"]
}

urgency 기준:
- "home": 집에서 케어 가능, 안정적인 상태
- "tomorrow": 24시간 내 병원 방문 필요
- "now": 즉시 응급 동물병원 방문 필요`,
        },
      ],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: err.message || "분석 중 오류가 발생했습니다." });
  }
});

// 오디오 분류 → 번역 (Hugging Face + Claude)
async function callHfAudio(audioBuffer, mimeType) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/MIT/ast-finetuned-audioset-10-10-0.4593",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": mimeType || "audio/webm",
          },
          body: audioBuffer,
        }
      );

      const data = await hfRes.json();
      if (!data.error) return data;

      const msg = data.error.toLowerCase();
      if (msg.includes("loading")) {
        const wait = data.estimated_time ? Math.min(data.estimated_time * 1000, 20000) : 8000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (msg.includes("terminated") && attempt < 3) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      // 그 외 에러 → null (폴백)
      return null;
    } catch {
      // JSON 파싱 실패 등 네트워크 오류 → 재시도
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

app.post("/api/classify-audio", async (req, res) => {
  const { audioBase64, mimeType, dog, context } = req.body;
  if (!audioBase64) return res.status(400).json({ error: "오디오가 없습니다." });

  const dogInfo = dog ? `이름: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살` : "강아지 정보 없음";

  try {
    // 1. HF 오디오 분류 (실패 시 null)
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const hfData = await callHfAudio(audioBuffer, mimeType);

    // 상위 5개 레이블 추출 (HF 실패 시 폴백 레이블)
    const topLabels = Array.isArray(hfData)
      ? hfData.slice(0, 5).map((r) => `${r.label} (${(r.score * 100).toFixed(0)}%)`).join(", ")
      : "알 수 없음 (오디오 분석 불가, 상황과 견종 기반으로 추측)";

    // 2. Claude 번역
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `당신은 강아지 언어를 유쾌하고 재치있게 번역해주는 AI입니다.
오디오 분석 결과와 상황을 바탕으로 강아지가 무슨 말을 하는지 1인칭으로 번역해주세요.
어디까지나 재미를 위한 것임을 잊지 마세요.`,
      messages: [{
        role: "user",
        content: `강아지 정보: ${dogInfo}
오디오 분석 결과: ${topLabels}
상황: ${context || "알 수 없음"}

다음 JSON 형식으로만 응답해주세요:
{
  "translation": "강아지가 하는 말 (1인칭, 2-3문장, 귀엽고 재치있게)",
  "mood": "현재 기분 한 단어",
  "moodEmoji": "기분을 표현하는 이모지 1개",
  "detectedSound": "감지된 소리 한국어로 (예: 짖음, 낑낑거림, 하울링)",
  "confidence": "번역 신뢰도 0-100 사이 숫자 (최대 65, 재미용)"
}`,
      }],
    });

    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    const result = JSON.parse(jsonMatch[0]);
    result.rawLabels = topLabels;
    res.json(result);
  } catch (err) {
    console.error("classify-audio error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 강아지 번역기 (수동 선택 방식 — 백업용)
app.post("/api/translate", async (req, res) => {
  const { dog, barkType, context } = req.body;
  if (!barkType || !context) return res.status(400).json({ error: "짖음 유형과 상황을 선택해주세요." });

  const dogInfo = dog ? `이름: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살` : "강아지 정보 없음";

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `당신은 강아지 언어를 유쾌하고 재치있게 번역해주는 AI입니다.
강아지의 성격과 견종 특성을 반영해서 1인칭으로 번역해주세요.
어디까지나 재미를 위한 것임을 잊지 마세요.`,
      messages: [{
        role: "user",
        content: `강아지 정보: ${dogInfo}
짖음 유형: ${barkType}
상황: ${context}

다음 JSON 형식으로만 응답해주세요:
{
  "translation": "강아지가 하는 말 (1인칭, 2-3문장, 귀엽고 재치있게)",
  "mood": "현재 기분 한 단어",
  "moodEmoji": "기분을 표현하는 이모지 1개",
  "confidence": "번역 신뢰도 0-100 사이 숫자 (항상 낮게, 재미용이므로 최대 60)"
}`,
      }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 제품 분석
app.post("/api/analyze-product", async (req, res) => {
  const { dog, imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "이미지를 업로드해주세요." });

  const dogInfo = dog
    ? `강아지: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살, 체중: ${dog.weight}kg`
    : "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
          },
          {
            type: "text",
            text: `이 반려견 용품/제품 사진을 분석해주세요.${dogInfo ? `\n보호자 강아지 정보: ${dogInfo}` : ""}

다음 JSON 형식으로만 응답해주세요:
{
  "productName": "제품명 또는 종류",
  "category": "카테고리 (사료/간식/장난감/의약품/용품 중 하나)",
  "description": "제품 설명 (2-3문장)",
  "mainIngredients": ["주요 성분 또는 재료 (사료/간식인 경우)"],
  "suitableAge": "적합한 나이대",
  "cautions": ["주의사항1", "주의사항2"],
  "rating": "이 강아지에게 추천 여부 (추천/보통/주의 중 하나)",
  "ratingReason": "추천 여부 이유 (1문장)"
}`,
          },
        ],
      }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT ?? 3099;
app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`);
});
