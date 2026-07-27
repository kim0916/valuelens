# 📈 주식 밸류에이션 앱 — 배포 & 키 설정 (초보자용)

이 문서는 **주식 밸류에이션 앱**(`ValueLens_APEX_recs__3_.jsx`)을 실제 웹앱으로
띄우는 방법을 하나씩 설명합니다. 코딩을 몰라도 그대로 따라 하면 됩니다.

> 참고: 이 저장소에는 앱이 **두 개** 들어 있어요.
> - `/` (홈): 기존 **부동산 가격평가** 앱
> - `/stocks.html`: 이번에 연결한 **주식 밸류에이션** 앱  ← 이게 우리가 만든 것
>
> 둘은 서로 방해하지 않고, 한 번의 배포로 같이 올라갑니다.

---

## 1. 앱이 데이터를 가져오는 방식 (왜 키가 필요한가)

| 데이터 | 어디서 오나 | 필요한 키 |
|---|---|---|
| **미국 주가** (실시간) | Finnhub | `FINNHUB_API_KEY` (무료) |
| **한국 주가** (실시간) | 야후 파이낸스 | **키 불필요** (무료) |
| **AI 분석** (EPS·적정PER·추천·뉴스) | Anthropic (Claude) | `ANTHROPIC_API_KEY` |

- 키는 **절대 코드에 적지 않습니다.** 브라우저에 노출되면 안 되니까요.
- 대신 **서버(Vercel)의 환경변수**에 넣으면, 우리 서버 코드(`/api/quote`, `/api/ai`)가
  그 키로 대신 호출해서 브라우저에는 결과만 돌려줍니다.

---

## 2. 키 발급받기 (각각 5분)

### (1) Finnhub — 미국 주가용 (무료)
1. https://finnhub.io 접속 → **Get free API key** (무료 가입)
2. 로그인하면 대시보드에 **API Key** 문자열이 보입니다. 복사해 두세요.

### (2) Anthropic — AI 분석용
1. https://console.anthropic.com 접속 → 가입/로그인
2. **API Keys** 메뉴 → **Create Key** → 만들어진 `sk-ant-...` 문자열을 복사해 두세요.
   - AI 호출은 사용량만큼 과금됩니다(소액). 콘솔에서 사용 한도를 걸어둘 수 있어요.

> 한국 주가(야후)는 키가 필요 없으니 따로 발급받을 게 없습니다.

---

## 3. Vercel에 배포하기 (가장 쉬운 길)

이 저장소는 이미 깃허브(`kim0916/valuelens`)에 있어요. Vercel이 깃허브를 읽어 자동 배포합니다.

1. https://vercel.com 접속 → **Continue with GitHub** 로 가입/로그인
2. **Add New… → Project** 클릭
3. 목록에서 **valuelens** 저장소를 **Import**
4. 설정 화면에서 **Build/Output 등은 그대로 두세요** (Vite 자동 인식)
5. **Environment Variables** 섹션을 펼쳐 아래 값을 추가:

   | Name | Value |
   |---|---|
   | `FINNHUB_API_KEY` | (2-(1)에서 복사한 Finnhub 키) |
   | `ANTHROPIC_API_KEY` | (2-(2)에서 복사한 `sk-ant-...` 키) |

6. **Deploy** 클릭 → 1~2분 뒤 `https://valuelens-xxxx.vercel.app` 주소가 나옵니다.

### 주식 앱 주소
- 홈(부동산): `https://valuelens-xxxx.vercel.app/`
- **주식 앱: `https://valuelens-xxxx.vercel.app/stocks.html`** ← 즐겨찾기 해두세요

> 🔁 이후 깃허브에 코드가 바뀌면 Vercel이 알아서 다시 배포합니다.
> 🔑 키를 바꾸면 **Settings → Environment Variables** 에서 수정 후,
> **Deployments** 탭에서 **Redeploy** 하세요.

---

## 4. 잘 되는지 확인하는 법

배포된 `/stocks.html` 에 들어가서:
1. 검색창에 미국 종목(예: `NVDA`)을 넣고 분석 → **주가가 Finnhub 실시간 값**으로 나오면 성공
2. 한국 종목(예: `삼성전자` 또는 `005930`)을 넣어 → **주가가 나오면** 야후 연동 성공
3. EPS·적정PER 등 AI 분석 카드가 채워지면 → Anthropic 키 정상

### 안 될 때
- 주가가 안 나오면: Vercel의 `FINNHUB_API_KEY` 오타/누락 확인 후 **Redeploy**
- AI 분석이 안 나오면: `ANTHROPIC_API_KEY` 확인, 그리고 콘솔에 결제수단/크레딧이 있는지 확인
- 바꾼 키가 반영 안 되면: 환경변수 저장 후 반드시 **Redeploy** 해야 적용됩니다

---

## 5. (선택) 내 컴퓨터에서 먼저 테스트

```bash
# 1) 라이브러리 설치 (최초 1회)
npm install

# 2) 키를 담은 .env 파일 만들기 (.env.example 참고)
#    FINNHUB_API_KEY=... / ANTHROPIC_API_KEY=...

# 3) 화면 + 서버리스 함수(/api)를 함께 실행
npm i -g vercel   # 최초 1회
vercel dev        # http://localhost:3000/stocks.html 로 접속
```

> `npm run dev` 만 쓰면 화면은 뜨지만 `/api`(주가·AI)는 동작하지 않습니다.
> 주가·AI까지 테스트하려면 위처럼 `vercel dev` 를 쓰세요.

---

> ⚠️ 이 앱은 참고용 계산 도구입니다. 투자 권유가 아니며 모든 판단과 책임은 본인에게 있습니다.
