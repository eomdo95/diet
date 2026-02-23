import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_WEIGHT = "diet_weight_logs";
const STORAGE_KEY_MEALS = "diet_meal_logs";
const STORAGE_KEY_WORKOUTS = "diet_workout_logs";
const STORAGE_KEY_GOAL = "diet_goal";
const STORAGE_KEY_WATER = "diet_water";

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" });
};

// ---------- Persistent storage helpers ----------
const load = async (key, fallback) => {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
};
const save = async (key, val) => {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
};

// ---------- Food DB (common Korean foods) ----------
const FOOD_DB = [
  { name: "공기밥", cal: 300, carb: 65, pro: 5, fat: 1 },
  { name: "삶은 달걀", cal: 78, carb: 1, pro: 6, fat: 5 },
  { name: "닭가슴살 100g", cal: 165, carb: 0, pro: 31, fat: 3.6 },
  { name: "바나나", cal: 89, carb: 23, pro: 1, fat: 0.3 },
  { name: "두부 100g", cal: 76, carb: 2, pro: 8, fat: 4 },
  { name: "샐러드(기본)", cal: 50, carb: 8, pro: 2, fat: 1 },
  { name: "라면", cal: 500, carb: 75, pro: 10, fat: 17 },
  { name: "김밥 1줄", cal: 340, carb: 60, pro: 10, fat: 7 },
  { name: "오트밀 100g", cal: 389, carb: 66, pro: 17, fat: 7 },
  { name: "그릭요거트", cal: 100, carb: 6, pro: 10, fat: 3 },
  { name: "우유 200ml", cal: 130, carb: 10, pro: 7, fat: 7 },
  { name: "아메리카노", cal: 10, carb: 2, pro: 0, fat: 0 },
  { name: "사과", cal: 72, carb: 19, pro: 0.4, fat: 0.2 },
  { name: "고구마 100g", cal: 86, carb: 20, pro: 1.6, fat: 0.1 },
];

const WORKOUT_DB = [
  { name: "걷기 30분", cal: 150, type: "유산소" },
  { name: "조깅 30분", cal: 300, type: "유산소" },
  { name: "러닝 30분", cal: 400, type: "유산소" },
  { name: "자전거 30분", cal: 250, type: "유산소" },
  { name: "수영 30분", cal: 350, type: "유산소" },
  { name: "스쿼트 3세트", cal: 100, type: "근력" },
  { name: "푸쉬업 3세트", cal: 80, type: "근력" },
  { name: "플랭크 3세트", cal: 50, type: "근력" },
  { name: "웨이트 트레이닝 1시간", cal: 300, type: "근력" },
  { name: "요가 1시간", cal: 200, type: "유연성" },
  { name: "HIIT 20분", cal: 300, type: "유산소" },
  { name: "필라테스 1시간", cal: 250, type: "유연성" },
];

const TABS = ["대시보드", "식단", "운동", "체중", "통계"];
const TAB_ICONS = ["🏠", "🍽️", "💪", "⚖️", "📊"];

export default function DietApp() {
  const [tab, setTab] = useState(0);
  const [weightLogs, setWeightLogs] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [goal, setGoal] = useState({ targetWeight: 65, dailyCal: 1800, startWeight: 75 });
  const [water, setWater] = useState({});
  const [loaded, setLoaded] = useState(false);

  // ---- Load ----
  useEffect(() => {
    Promise.all([
      load(STORAGE_KEY_WEIGHT, []),
      load(STORAGE_KEY_MEALS, []),
      load(STORAGE_KEY_WORKOUTS, []),
      load(STORAGE_KEY_GOAL, { targetWeight: 65, dailyCal: 1800, startWeight: 75 }),
      load(STORAGE_KEY_WATER, {}),
    ]).then(([w, m, wo, g, wa]) => {
      setWeightLogs(w); setMealLogs(m); setWorkoutLogs(wo); setGoal(g); setWater(wa);
      setLoaded(true);
    });
  }, []);

  const saveWeights = (v) => { setWeightLogs(v); save(STORAGE_KEY_WEIGHT, v); };
  const saveMeals = (v) => { setMealLogs(v); save(STORAGE_KEY_MEALS, v); };
  const saveWorkouts = (v) => { setWorkoutLogs(v); save(STORAGE_KEY_WORKOUTS, v); };
  const saveGoal = (v) => { setGoal(v); save(STORAGE_KEY_GOAL, v); };
  const saveWater = (v) => { setWater(v); save(STORAGE_KEY_WATER, v); };

  if (!loaded) return <div style={{ background: "#0f0f13", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#a3e635", fontFamily: "monospace", fontSize: 24 }}>로딩 중...</div>;

  return (
    <App
      tab={tab} setTab={setTab}
      weightLogs={weightLogs} saveWeights={saveWeights}
      mealLogs={mealLogs} saveMeals={saveMeals}
      workoutLogs={workoutLogs} saveWorkouts={saveWorkouts}
      goal={goal} saveGoal={saveGoal}
      water={water} saveWater={saveWater}
    />
  );
}

function App({ tab, setTab, weightLogs, saveWeights, mealLogs, saveMeals, workoutLogs, saveWorkouts, goal, saveGoal, water, saveWater }) {
  const todayMeals = mealLogs.filter(m => m.date === today());
  const todayWorkouts = workoutLogs.filter(w => w.date === today());
  const todayCalIn = todayMeals.reduce((s, m) => s + m.cal, 0);
  const todayCalOut = todayWorkouts.reduce((s, w) => s + w.cal, 0);
  const todayNet = todayCalIn - todayCalOut;
  const todayWater = water[today()] || 0;
  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : null;

  return (
    <div style={{ background: "#0f0f13", minHeight: "100vh", fontFamily: "'Noto Sans KR', sans-serif", color: "#e8e8e8", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input, select, textarea { outline: none; }
        button { cursor: pointer; border: none; background: none; }
        .card { background: #1a1a24; border-radius: 16px; padding: 16px; border: 1px solid #2a2a38; }
        .accent { color: #a3e635; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        input[type=number], input[type=text], select {
          background: #0f0f13; border: 1px solid #2a2a38; border-radius: 10px;
          color: #e8e8e8; padding: 8px 12px; width: 100%; font-size: 14px;
        }
        input[type=number]:focus, input[type=text]:focus, select:focus { border-color: #a3e635; }
        .btn-primary { background: #a3e635; color: #0f0f13; border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 14px; transition: opacity 0.15s; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-ghost { border: 1px solid #2a2a38; border-radius: 10px; padding: 8px 14px; color: #999; font-size: 13px; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #a3e635; color: #a3e635; }
        .ring-bg { fill: none; stroke: #2a2a38; }
        .ring-fg { fill: none; stroke: #a3e635; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>Personal</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#a3e635" }}>다이어트 트래커</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#666" }}>{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</div>
          {latestWeight && <div style={{ fontSize: 16, fontWeight: 600, color: "#a3e635" }}>{latestWeight}kg</div>}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {tab === 0 && <Dashboard todayCalIn={todayCalIn} todayCalOut={todayCalOut} todayNet={todayNet} goal={goal} todayWater={todayWater} saveWater={saveWater} water={water} latestWeight={latestWeight} todayMeals={todayMeals} todayWorkouts={todayWorkouts} saveGoal={saveGoal} />}
        {tab === 1 && <MealTab mealLogs={mealLogs} saveMeals={saveMeals} goal={goal} />}
        {tab === 2 && <WorkoutTab workoutLogs={workoutLogs} saveWorkouts={saveWorkouts} />}
        {tab === 3 && <WeightTab weightLogs={weightLogs} saveWeights={saveWeights} goal={goal} saveGoal={saveGoal} />}
        {tab === 4 && <StatsTab mealLogs={mealLogs} workoutLogs={workoutLogs} weightLogs={weightLogs} goal={goal} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#1a1a24", borderTop: "1px solid #2a2a38", display: "flex", zIndex: 100 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ flex: 1, padding: "10px 0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s" }}>
            <div style={{ fontSize: 20 }}>{TAB_ICONS[i]}</div>
            <div style={{ fontSize: 10, color: tab === i ? "#a3e635" : "#555", fontWeight: tab === i ? 700 : 400 }}>{t}</div>
            {tab === i && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#a3e635", marginTop: -2 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ======================== DASHBOARD ========================
function Dashboard({ todayCalIn, todayCalOut, todayNet, goal, todayWater, saveWater, water, latestWeight, todayMeals, todayWorkouts, saveGoal }) {
  const [showGoal, setShowGoal] = useState(false);
  const [editGoal, setEditGoal] = useState({ ...goal });
  const pct = Math.min(todayCalIn / goal.dailyCal, 1);
  const circumference = 2 * Math.PI * 48;
  const burned = todayCalOut;
  const bmi = latestWeight ? (latestWeight / ((1.7 * 1.7))).toFixed(1) : null;

  const addWater = () => {
    const newWater = { ...water, [today()]: (water[today()] || 0) + 250 };
    saveWater(newWater);
  };
  const removeWater = () => {
    if ((water[today()] || 0) < 250) return;
    const newWater = { ...water, [today()]: (water[today()] || 0) - 250 };
    saveWater(newWater);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Calorie Ring */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle className="ring-bg" cx={56} cy={56} r={48} strokeWidth={10} />
          <circle className="ring-fg" cx={56} cy={56} r={48} strokeWidth={10}
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
            style={{ transformOrigin: "56px 56px", transform: "rotate(-90deg)" }} />
          <text x={56} y={50} textAnchor="middle" fill="#e8e8e8" fontSize={16} fontWeight={700}>{todayCalIn}</text>
          <text x={56} y={66} textAnchor="middle" fill="#666" fontSize={11}>kcal 섭취</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>목표 칼로리</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#a3e635" }}>{goal.dailyCal} kcal</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#666" }}>소모</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80" }}>-{burned}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#666" }}>순칼로리</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: todayNet > goal.dailyCal ? "#f87171" : "#e8e8e8" }}>{todayNet}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#666" }}>남은</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#a3e635" }}>{Math.max(goal.dailyCal - todayNet, 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Water Tracker */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>💧 물 섭취</div>
          <div style={{ fontSize: 13, color: "#a3e635" }}>{todayWater}ml / 2000ml</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 28, borderRadius: 6,
              background: i < Math.floor(todayWater / 250) ? "#a3e635" :
                i === Math.floor(todayWater / 250) && todayWater % 250 > 0 ? "#4a6a1a" : "#2a2a38",
              transition: "background 0.2s"
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={removeWater} style={{ flex: 1 }}>-250ml</button>
          <button className="btn-primary" onClick={addWater} style={{ flex: 2 }}>+250ml 추가</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24 }}>🏋️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#a3e635" }}>{todayWorkouts.length}</div>
          <div style={{ fontSize: 11, color: "#666" }}>오늘 운동</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24 }}>🍽️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#a3e635" }}>{todayMeals.length}</div>
          <div style={{ fontSize: 11, color: "#666" }}>오늘 식사</div>
        </div>
        {latestWeight && <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24 }}>⚖️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#a3e635" }}>{latestWeight}kg</div>
          <div style={{ fontSize: 11, color: "#666" }}>현재 체중</div>
        </div>}
        {latestWeight && <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24 }}>📐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#a3e635" }}>{bmi}</div>
          <div style={{ fontSize: 11, color: "#666" }}>BMI</div>
        </div>}
      </div>

      {/* Goal edit */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showGoal ? 12 : 0 }}>
          <div style={{ fontWeight: 600 }}>🎯 목표 설정</div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setShowGoal(!showGoal)}>{showGoal ? "접기" : "수정"}</button>
        </div>
        {showGoal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>시작 체중 (kg)</div>
              <input type="number" value={editGoal.startWeight} step={0.1} onChange={e => setEditGoal({ ...editGoal, startWeight: parseFloat(e.target.value) })} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>목표 체중 (kg)</div>
              <input type="number" value={editGoal.targetWeight} step={0.1} onChange={e => setEditGoal({ ...editGoal, targetWeight: parseFloat(e.target.value) })} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>일일 칼로리 목표 (kcal)</div>
              <input type="number" value={editGoal.dailyCal} onChange={e => setEditGoal({ ...editGoal, dailyCal: parseInt(e.target.value) })} />
            </div>
            <button className="btn-primary" onClick={() => { saveGoal(editGoal); setShowGoal(false); }}>저장</button>
          </div>
        )}
        {!showGoal && (
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div><span style={{ fontSize: 11, color: "#666" }}>시작 </span><span style={{ color: "#a3e635", fontWeight: 600 }}>{goal.startWeight}kg</span></div>
            <div>→</div>
            <div><span style={{ fontSize: 11, color: "#666" }}>목표 </span><span style={{ color: "#a3e635", fontWeight: 600 }}>{goal.targetWeight}kg</span></div>
            <div style={{ marginLeft: "auto" }}><span style={{ fontSize: 11, color: "#666" }}>잔여 </span><span style={{ color: latestWeight ? (latestWeight - goal.targetWeight > 0 ? "#f87171" : "#4ade80") : "#666", fontWeight: 600 }}>{latestWeight ? Math.abs(latestWeight - goal.targetWeight).toFixed(1) : "?"}kg</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================== MEAL TAB ========================
function MealTab({ mealLogs, saveMeals, goal }) {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [mealType, setMealType] = useState("아침");
  const [custom, setCustom] = useState({ name: "", cal: "", carb: "", pro: "", fat: "" });

  const filtered = FOOD_DB.filter(f => f.name.includes(query));
  const dayMeals = mealLogs.filter(m => m.date === selectedDate);
  const totalCal = dayMeals.reduce((s, m) => s + m.cal, 0);
  const groups = ["아침", "점심", "저녁", "간식"].map(t => ({ type: t, meals: dayMeals.filter(m => m.mealType === t) }));

  const addFood = (food) => {
    const newLog = { id: Date.now(), date: selectedDate, mealType, ...food };
    saveMeals([...mealLogs, newLog]);
    setShowAdd(false);
    setQuery("");
  };
  const addCustom = () => {
    if (!custom.name || !custom.cal) return;
    addFood({ name: custom.name, cal: parseInt(custom.cal), carb: parseInt(custom.carb) || 0, pro: parseInt(custom.pro) || 0, fat: parseInt(custom.fat) || 0 });
    setCustom({ name: "", cal: "", carb: "", pro: "", fat: "" });
  };
  const deleteMeal = (id) => saveMeals(mealLogs.filter(m => m.id !== id));

  const macros = {
    carb: dayMeals.reduce((s, m) => s + (m.carb || 0), 0),
    pro: dayMeals.reduce((s, m) => s + (m.pro || 0), 0),
    fat: dayMeals.reduce((s, m) => s + (m.fat || 0), 0),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>+ 추가</button>
      </div>

      {/* Summary */}
      <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#a3e635" }}>{totalCal}</div>
          <div style={{ fontSize: 10, color: "#666" }}>kcal</div>
        </div>
        <div style={{ width: 1, background: "#2a2a38" }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#60a5fa" }}>{macros.carb}g</div>
          <div style={{ fontSize: 10, color: "#666" }}>탄수화물</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80" }}>{macros.pro}g</div>
          <div style={{ fontSize: 10, color: "#666" }}>단백질</div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fbbf24" }}>{macros.fat}g</div>
          <div style={{ fontSize: 10, color: "#666" }}>지방</div>
        </div>
      </div>

      {/* Add Food */}
      {showAdd && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select value={mealType} onChange={e => setMealType(e.target.value)}>
            {["아침", "점심", "저녁", "간식"].map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="text" placeholder="음식 검색..." value={query} onChange={e => setQuery(e.target.value)} />
          {query && (
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.length === 0 && <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 10 }}>검색 결과 없음</div>}
              {filtered.map((f, i) => (
                <button key={i} onClick={() => addFood(f)} style={{ background: "#0f0f13", border: "1px solid #2a2a38", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#e8e8e8" }}>
                  <span style={{ fontSize: 14 }}>{f.name}</span>
                  <span style={{ color: "#a3e635", fontSize: 13, fontWeight: 600 }}>{f.cal} kcal</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ borderTop: "1px solid #2a2a38", paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>직접 입력</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input type="text" placeholder="음식명" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} style={{ gridColumn: "span 2" }} />
              <input type="number" placeholder="칼로리 (kcal)" value={custom.cal} onChange={e => setCustom({ ...custom, cal: e.target.value })} />
              <input type="number" placeholder="탄수화물 (g)" value={custom.carb} onChange={e => setCustom({ ...custom, carb: e.target.value })} />
              <input type="number" placeholder="단백질 (g)" value={custom.pro} onChange={e => setCustom({ ...custom, pro: e.target.value })} />
              <input type="number" placeholder="지방 (g)" value={custom.fat} onChange={e => setCustom({ ...custom, fat: e.target.value })} />
            </div>
            <button className="btn-primary" onClick={addCustom} style={{ width: "100%", marginTop: 8 }}>직접 추가</button>
          </div>
        </div>
      )}

      {/* Meal Groups */}
      {groups.map(g => g.meals.length > 0 && (
        <div key={g.type} className="card">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a3e635", marginBottom: 8 }}>{g.type}</div>
          {g.meals.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1f1f2e" }}>
              <div>
                <div style={{ fontSize: 14 }}>{m.name}</div>
                {m.pro > 0 && <div style={{ fontSize: 11, color: "#666" }}>탄{m.carb}g · 단{m.pro}g · 지{m.fat}g</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, color: "#a3e635" }}>{m.cal}</span>
                <button onClick={() => deleteMeal(m.id)} style={{ color: "#555", fontSize: 16 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {dayMeals.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
          <div>아직 기록된 식단이 없습니다</div>
        </div>
      )}
    </div>
  );
}

// ======================== WORKOUT TAB ========================
function WorkoutTab({ workoutLogs, saveWorkouts }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today());
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState({ name: "", cal: "", type: "유산소", duration: "" });

  const filtered = WORKOUT_DB.filter(w => w.name.includes(query) || w.type.includes(query));
  const dayWorkouts = workoutLogs.filter(w => w.date === selectedDate);
  const totalCal = dayWorkouts.reduce((s, w) => s + w.cal, 0);

  const addWorkout = (w) => {
    saveWorkouts([...workoutLogs, { id: Date.now(), date: selectedDate, ...w }]);
    setShowAdd(false);
    setQuery("");
  };
  const addCustom = () => {
    if (!custom.name || !custom.cal) return;
    addWorkout({ name: custom.name + (custom.duration ? ` ${custom.duration}분` : ""), cal: parseInt(custom.cal), type: custom.type });
    setCustom({ name: "", cal: "", type: "유산소", duration: "" });
  };
  const deleteWorkout = (id) => saveWorkouts(workoutLogs.filter(w => w.id !== id));

  const typeColor = { "유산소": "#60a5fa", "근력": "#f87171", "유연성": "#a78bfa" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>+ 추가</button>
      </div>

      {dayWorkouts.length > 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80" }}>🔥 {totalCal} kcal</div>
          <div style={{ fontSize: 11, color: "#666" }}>오늘 소모 칼로리</div>
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="text" placeholder="운동 검색..." value={query} onChange={e => setQuery(e.target.value)} />
          {query && (
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((w, i) => (
                <button key={i} onClick={() => addWorkout(w)} style={{ background: "#0f0f13", border: "1px solid #2a2a38", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#e8e8e8" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14 }}>{w.name}</div>
                    <span className="tag" style={{ background: (typeColor[w.type] + "22"), color: typeColor[w.type] }}>{w.type}</span>
                  </div>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>-{w.cal} kcal</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ borderTop: "1px solid #2a2a38", paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>직접 입력</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input type="text" placeholder="운동명" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" placeholder="시간(분)" value={custom.duration} onChange={e => setCustom({ ...custom, duration: e.target.value })} />
                <input type="number" placeholder="소모 칼로리" value={custom.cal} onChange={e => setCustom({ ...custom, cal: e.target.value })} />
              </div>
              <select value={custom.type} onChange={e => setCustom({ ...custom, type: e.target.value })}>
                {["유산소", "근력", "유연성"].map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="btn-primary" onClick={addCustom}>추가</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dayWorkouts.map(w => (
          <div key={w.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name}</div>
              <span className="tag" style={{ background: (typeColor[w.type] + "22") || "#2a2a38", color: typeColor[w.type] || "#666" }}>{w.type}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#4ade80", fontWeight: 700 }}>-{w.cal}</div>
                <div style={{ fontSize: 10, color: "#666" }}>kcal</div>
              </div>
              <button onClick={() => deleteWorkout(w.id)} style={{ color: "#555", fontSize: 18 }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {dayWorkouts.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💪</div>
          <div>오늘 운동 기록을 추가해보세요</div>
        </div>
      )}
    </div>
  );
}

// ======================== WEIGHT TAB ========================
function WeightTab({ weightLogs, saveWeights, goal, saveGoal }) {
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());

  const addWeight = () => {
    if (!weight) return;
    const existing = weightLogs.findIndex(w => w.date === date);
    let newLogs;
    if (existing >= 0) {
      newLogs = weightLogs.map((w, i) => i === existing ? { ...w, weight: parseFloat(weight), note } : w);
    } else {
      newLogs = [...weightLogs, { date, weight: parseFloat(weight), note }].sort((a, b) => a.date.localeCompare(b.date));
    }
    saveWeights(newLogs);
    setWeight(""); setNote("");
  };

  const deleteWeight = (date) => saveWeights(weightLogs.filter(w => w.date !== date));

  const latest = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : null;
  const first = weightLogs.length ? weightLogs[0].weight : null;
  const change = first && latest ? (latest - first).toFixed(1) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Input */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>체중 기록</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div style={{ position: "relative" }}>
          <input type="number" placeholder="체중 입력" step={0.1} value={weight} onChange={e => setWeight(e.target.value)} style={{ paddingRight: 40 }} />
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 13 }}>kg</span>
        </div>
        <input type="text" placeholder="메모 (선택)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="btn-primary" onClick={addWeight}>기록하기</button>
      </div>

      {/* Stats */}
      {weightLogs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#a3e635" }}>{latest}kg</div>
            <div style={{ fontSize: 10, color: "#666" }}>현재</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: goal.targetWeight < latest ? "#f87171" : "#4ade80" }}>{goal.targetWeight}kg</div>
            <div style={{ fontSize: 10, color: "#666" }}>목표</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: change > 0 ? "#f87171" : "#4ade80" }}>{change > 0 ? "+" : ""}{change}kg</div>
            <div style={{ fontSize: 10, color: "#666" }}>총 변화</div>
          </div>
        </div>
      )}

      {/* Mini chart */}
      {weightLogs.length > 1 && <MiniWeightChart logs={weightLogs} goal={goal} />}

      {/* Log list */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>기록 내역</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...weightLogs].reverse().slice(0, 14).map(w => (
            <div key={w.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1f1f2e" }}>
              <div>
                <div style={{ fontSize: 13 }}>{formatDate(w.date)}</div>
                {w.note && <div style={{ fontSize: 11, color: "#666" }}>{w.note}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, color: "#a3e635" }}>{w.weight}kg</span>
                <button onClick={() => deleteWeight(w.date)} style={{ color: "#555", fontSize: 16 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniWeightChart({ logs, goal }) {
  const last14 = logs.slice(-14);
  const weights = last14.map(l => l.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const W = 340, H = 100;
  const toY = (w) => H - ((w - min) / (max - min)) * H;
  const toX = (i) => (i / (last14.length - 1)) * W;

  const path = last14.map((l, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(l.weight).toFixed(1)}`).join(" ");
  const goalY = toY(goal.targetWeight);

  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>최근 체중 추이</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
        {goalY >= 0 && goalY <= H && (
          <>
            <line x1={0} y1={goalY} x2={W} y2={goalY} stroke="#a3e63555" strokeDasharray="4 4" strokeWidth={1} />
            <text x={W - 2} y={goalY - 4} textAnchor="end" fill="#a3e635" fontSize={9}>목표</text>
          </>
        )}
        <path d={path} fill="none" stroke="#a3e635" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {last14.map((l, i) => (
          <circle key={i} cx={toX(i)} cy={toY(l.weight)} r={3} fill="#a3e635" />
        ))}
      </svg>
    </div>
  );
}

// ======================== STATS TAB ========================
function StatsTab({ mealLogs, workoutLogs, weightLogs, goal }) {
  const days7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const weekCals = days7.map(d => ({
    date: d,
    cal: mealLogs.filter(m => m.date === d).reduce((s, m) => s + m.cal, 0),
    burned: workoutLogs.filter(w => w.date === d).reduce((s, w) => s + w.cal, 0),
  }));

  const maxCal = Math.max(...weekCals.map(w => w.cal), goal.dailyCal, 100);

  const totalWorkouts = workoutLogs.length;
  const avgCal = mealLogs.length > 0 ? Math.round(
    Object.entries(mealLogs.reduce((acc, m) => {
      if (!acc[m.date]) acc[m.date] = 0;
      acc[m.date] += m.cal; return acc;
    }, {})).reduce((s, [, v]) => s + v, 0) / Object.keys(mealLogs.reduce((acc, m) => { acc[m.date] = 1; return acc; }, {})).length
  ) : 0;

  const streak = (() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split("T")[0];
      if (weightLogs.some(w => w.date === key) || mealLogs.some(m => m.date === key) || workoutLogs.some(w => w.date === key)) {
        s++; d.setDate(d.getDate() - 1);
      } else break;
    }
    return s;
  })();

  const workoutTypes = workoutLogs.reduce((acc, w) => {
    acc[w.type] = (acc[w.type] || 0) + 1; return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Streak */}
      <div className="card" style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 40 }}>🔥</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#a3e635" }}>{streak}일</div>
        <div style={{ color: "#666", fontSize: 13 }}>연속 기록 중</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#a3e635" }}>{avgCal}</div>
          <div style={{ fontSize: 11, color: "#666" }}>평균 일일 칼로리</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{totalWorkouts}</div>
          <div style={{ fontSize: 11, color: "#666" }}>총 운동 횟수</div>
        </div>
      </div>

      {/* Weekly Cal Bar Chart */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>주간 칼로리 현황</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100 }}>
          {weekCals.map((d, i) => {
            const calH = (d.cal / maxCal) * 100;
            const burnH = (d.burned / maxCal) * 100;
            const goalH = (goal.dailyCal / maxCal) * 100;
            const isToday = d.date === today();
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", height: 100, position: "relative", display: "flex", alignItems: "flex-end", gap: 2 }}>
                  <div style={{ position: "absolute", top: `${100 - goalH}%`, left: 0, right: 0, height: 1, background: "#a3e63555", zIndex: 1 }} />
                  <div style={{ flex: 1, height: `${calH}%`, background: isToday ? "#a3e635" : "#3a4a20", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
                  {d.burned > 0 && <div style={{ flex: 1, height: `${burnH}%`, background: "#1e4a30", borderRadius: "3px 3px 0 0" }} />}
                </div>
                <div style={{ fontSize: 9, color: isToday ? "#a3e635" : "#555" }}>
                  {new Date(d.date).toLocaleDateString("ko-KR", { weekday: "short" })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#a3e635" }} /><span style={{ fontSize: 10, color: "#666" }}>섭취</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#1e4a30" }} /><span style={{ fontSize: 10, color: "#666" }}>소모</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 1, background: "#a3e63555" }} /><span style={{ fontSize: 10, color: "#666" }}>목표</span></div>
        </div>
      </div>

      {/* Workout breakdown */}
      {Object.keys(workoutTypes).length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>운동 유형 분포</div>
          {Object.entries(workoutTypes).map(([type, count]) => {
            const colors = { "유산소": "#60a5fa", "근력": "#f87171", "유연성": "#a78bfa" };
            const pct = Math.round((count / totalWorkouts) * 100);
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: colors[type] || "#a3e635" }}>{type}</span>
                  <span style={{ fontSize: 12, color: "#666" }}>{count}회 ({pct}%)</span>
                </div>
                <div style={{ background: "#2a2a38", borderRadius: 99, height: 6 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: colors[type] || "#a3e635", borderRadius: 99, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weight progress */}
      {weightLogs.length >= 2 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>체중 변화 요약</div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{weightLogs[0].weight}kg</div>
              <div style={{ fontSize: 10, color: "#666" }}>시작</div>
            </div>
            <div>
              <div style={{ fontSize: 28 }}>{(weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight) <= 0 ? "📉" : "📈"}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#a3e635" }}>{weightLogs[weightLogs.length - 1].weight}kg</div>
              <div style={{ fontSize: 10, color: "#666" }}>현재</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: goal.targetWeight }}>{goal.targetWeight}kg</div>
              <div style={{ fontSize: 10, color: "#666" }}>목표</div>
            </div>
          </div>
          {weightLogs.length > 0 && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#0f0f13", borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: "#666" }}>목표까지</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#a3e635" }}>
                {Math.abs(weightLogs[weightLogs.length - 1].weight - goal.targetWeight).toFixed(1)}kg 남음
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
