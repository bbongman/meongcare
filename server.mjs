import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import webpush from "web-push";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));

// ── JWT 시크릿 ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// ── 사용자 저장소 (JSON 파일) ────────────────────────────────────────────────
// Railway 볼륨: /app/data, 로컬 개발: ./data
const DATA_DIR = existsSync("/app/data") ? "/app/data" : path.join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const USERS_FILE = path.join(DATA_DIR, "users.json");

function loadUsers() {
  if (!existsSync(USERS_FILE)) return [];
  try { return JSON.parse(readFileSync(USERS_FILE, "utf8")); } catch { return []; }
}
function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ── 인증 미들웨어 ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "로그인이 필요해요." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "세션이 만료됐어요. 다시 로그인해주세요." });
  }
}

// ── 회원가입 / 로그인 API ────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim() || !password) return res.status(400).json({ error: "이름과 비밀번호를 입력해주세요." });
  if (password.length < 4) return res.status(400).json({ error: "비밀번호는 4자 이상이어야 해요." });

  const users = loadUsers();
  if (users.find((u) => u.name === name.trim())) {
    return res.status(409).json({ error: "이미 사용 중인 이름이에요." });
  }

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const user = { id, name: name.trim(), hash, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);

  const token = jwt.sign({ id, name: user.name }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { id, name: user.name } });
});

app.post("/api/auth/login", async (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim() || !password) return res.status(400).json({ error: "이름과 비밀번호를 입력해주세요." });

  const users = loadUsers();
  const user = users.find((u) => u.name === name.trim());
  if (!user) return res.status(401).json({ error: "존재하지 않는 사용자예요." });

  const valid = await bcrypt.compare(password, user.hash);
  if (!valid) return res.status(401).json({ error: "비밀번호가 틀렸어요." });

  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { id: user.id, name: user.name } });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });
  const { hash, ...safe } = user;
  res.json({ user: safe });
});

app.patch("/api/auth/profile", authMiddleware, (req, res) => {
  const { gender, phone, memo } = req.body;
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });
  if (gender !== undefined) users[idx].gender = gender;
  if (phone !== undefined) users[idx].phone = phone;
  if (memo !== undefined) users[idx].memo = memo;
  saveUsers(users);
  const { hash, ...safe } = users[idx];
  res.json({ user: safe });
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── VAPID 설정 ──────────────────────────────────────────────────────────────
// 배포 환경: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 환경변수 사용
// 로컬 개발: vapid.json 파일 자동 생성
const VAPID_FILE = path.join(__dirname, "vapid.json");
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else if (existsSync(VAPID_FILE)) {
  vapidKeys = JSON.parse(readFileSync(VAPID_FILE, "utf8"));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  console.log("✅ VAPID 키 생성 완료 →", VAPID_FILE);
  console.log("🔑 배포 시 아래 값을 환경변수로 등록하세요:");
  console.log("   VAPID_PUBLIC_KEY =", vapidKeys.publicKey);
  console.log("   VAPID_PRIVATE_KEY =", vapidKeys.privateKey);
}
webpush.setVapidDetails(
  "mailto:admin@meongcare.app",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// ── 인메모리 저장소 ──────────────────────────────────────────────────────────
const subscriptions = new Map(); // clientId → PushSubscription
const serverSchedules = new Map(); // id → Schedule
const firedThisMinute = new Map(); // scheduleId → "HH:mm"
const firedOnce = new Set(); // scheduleId (repeat=none 전송 완료)

// ── 푸시 알림 API ─────────────────────────────────────────────────────────────
app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/api/push-subscribe", (req, res) => {
  const { subscription, clientId, userId } = req.body;
  if (!subscription || !clientId) return res.status(400).json({ error: "missing fields" });
  subscriptions.set(clientId, { ...subscription, userId: userId || null });
  console.log(`📱 푸시 구독 등록: ${clientId} userId=${userId || "anonymous"} (총 ${subscriptions.size}개)`);
  res.json({ ok: true });
});

app.delete("/api/push-unsubscribe", (req, res) => {
  const { clientId } = req.body;
  subscriptions.delete(clientId);
  res.json({ ok: true });
});

// ── 스케줄 동기화 ─────────────────────────────────────────────────────────────
app.post("/api/schedules/sync", (req, res) => {
  const { schedules, userId } = req.body;
  if (!Array.isArray(schedules)) return res.status(400).json({ error: "schedules must be array" });
  // 해당 userId의 기존 스케줄만 제거 후 재등록
  if (userId) {
    for (const [id, s] of serverSchedules) {
      if (s._userId === userId) serverSchedules.delete(id);
    }
  } else {
    serverSchedules.clear();
  }
  schedules.forEach((s) => serverSchedules.set(s.id, { ...s, _userId: userId || null }));
  console.log(`🗓️ 스케줄 동기화: ${schedules.length}개 (userId=${userId || "anonymous"})`);
  res.json({ ok: true });
});

// ── 테스트 알림 ───────────────────────────────────────────────────────────────
app.post("/api/push-test", async (req, res) => {
  const { userId } = req.body;
  const targets = [...subscriptions.entries()].filter(([, sub]) => {
    if (userId && sub.userId) return sub.userId === userId;
    return true;
  });
  if (targets.length === 0) {
    return res.status(400).json({ error: "등록된 구독자가 없어요. 알림 허용 버튼을 먼저 눌러주세요." });
  }
  const payload = JSON.stringify({
    title: "🐾 멍케어 테스트 알림",
    body: "푸시 알림이 정상 작동하고 있어요!",
  });
  const results = await Promise.allSettled(
    targets.map(([clientId, sub]) => {
      const pushSub = { endpoint: sub.endpoint, keys: sub.keys };
      return webpush.sendNotification(pushSub, payload).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) subscriptions.delete(clientId);
        throw err;
      });
    })
  );
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  console.log(`🔔 테스트 알림: ${succeeded}/${results.length} 성공`);
  res.json({ ok: true, sent: succeeded, total: results.length });
});

// ── 스케줄 알림 발송 ──────────────────────────────────────────────────────────
function sendPushToUser(userId, payload) {
  const text = JSON.stringify(payload);
  for (const [clientId, sub] of subscriptions) {
    // userId가 일치하거나, 둘 다 없으면(레거시) 전송
    if (userId && sub.userId && sub.userId !== userId) continue;
    const pushSub = { endpoint: sub.endpoint, keys: sub.keys };
    webpush.sendNotification(pushSub, text).catch((err) => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        subscriptions.delete(clientId);
      }
    });
  }
}

function checkSchedules() {
  if (subscriptions.size === 0) return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayStr = now.toISOString().slice(0, 10);

  for (const [id, s] of serverSchedules) {
    if (!s.enabled) continue;

    // ── 예방접종: D-7, D-1, D-day 오전 9시 알림 ──────────────────────────────
    if (s.type === "vaccine") {
      if (!s.vaccineDate || hhmm !== "09:00") continue;
      const fireKey = `${id}_${todayStr}`;
      if (firedThisMinute.get(id) === fireKey) continue;

      const target = new Date(s.vaccineDate);
      target.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const diff = Math.round((target - today) / 86400000);

      if (diff === 7 || diff === 1 || diff === 0) {
        firedThisMinute.set(id, fireKey);
        const label = diff === 0 ? "오늘이에요!" : `D-${diff}이에요!`;
        sendPushToUser(s._userId, {
          title: `💉 예방접종 알림`,
          body: s.dogName ? `${s.dogName}의 ${s.title} ${label}` : `${s.title} ${label}`,
        });
        console.log(`🔔 예방접종 알림: ${s.title} D-${diff}`);
      }
      continue;
    }

    // ── 일반 스케줄 ────────────────────────────────────────────────────────────
    if (s.time !== hhmm) continue;
    if (firedThisMinute.get(id) === hhmm) continue;

    const created = new Date(s.createdAt);
    let shouldFire = false;
    if (s.repeat === "daily") shouldFire = true;
    else if (s.repeat === "weekly") shouldFire = now.getDay() === created.getDay();
    else if (s.repeat === "monthly") shouldFire = now.getDate() === created.getDate();
    else if (s.repeat === "none") {
      if (!firedOnce.has(id)) { shouldFire = true; firedOnce.add(id); }
    }

    if (!shouldFire) continue;

    firedThisMinute.set(id, hhmm);
    sendPushToUser(s._userId, {
      title: `🐾 ${s.title}`,
      body: s.dogName ? `${s.dogName}의 ${s.title} 시간이에요!` : `${s.title} 시간이에요!`,
    });
    console.log(`🔔 알림 발송: ${s.title} @ ${hhmm}`);
  }
}

// 다음 정각(분)에 맞춰 시작 후 1분마다 반복
const now = new Date();
const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
setTimeout(() => {
  checkSchedules();
  setInterval(checkSchedules, 60_000);
}, msUntilNextMinute);

// ── AI 분석 API ────────────────────────────────────────────────────────────────
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
      return null;
    } catch {
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
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const hfData = await callHfAudio(audioBuffer, mimeType);

    const topLabels = Array.isArray(hfData)
      ? hfData.slice(0, 5).map((r) => `${r.label} (${(r.score * 100).toFixed(0)}%)`).join(", ")
      : "알 수 없음 (오디오 분석 불가, 상황과 견종 기반으로 추측)";

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

// ── 프론트엔드 정적 파일 서빙 (프로덕션) ────────────────────────────────────
const distDir = path.join(__dirname, "dist/public");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const PORT = process.env.PORT ?? process.env.API_PORT ?? 3099;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
