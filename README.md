# ValueLens — 주식 밸류에이션 웹앱

내가 만든 밸류에이션 도구(`ValueLens_APEX_recs__3_.jsx`)를 실제로 쓸 수 있는 웹앱으로 만든 버전이에요.

- **미국 주식 가격**: Finnhub 실시간
- **한국 주식 가격**: 야후 파이낸스(`.KS`/`.KQ`) — 무료, 키 불필요
- **AI 분석(EPS·적정PER 등)**: 본인 Anthropic 키를 쓰는 작은 서버(서버리스 함수)를 통해 동작
- **배포**: Vercel (무료 등급)

> ⚠️ 이 앱은 참고용 계산 도구입니다. 투자 권유가 아니며 모든 판단과 책임은 본인에게 있습니다.

---

## 0. 큰 그림 (왜 서버가 필요한가)

원래 코드는 챗 안에서만 동작했어요. 챗 환경이 몰래 AI 인증을 넣어줬기 때문이에요.
밖에서는 두 가지 문제가 있어요:

1. **키 노출** — 브라우저에 API 키를 넣으면 누구나 훔쳐 쓸 수 있어요.
2. **CORS 차단** — 브라우저가 `api.anthropic.com` 같은 외부 주소를 직접 부르면 막혀요.

그래서 **작은 서버(서버리스 함수)** 2개를 뒀어요. 키는 서버에만 두고, 브라우저는 우리 서버한테만 요청해요.

```
브라우저(앱)  ──>  /api/ai     ──> Anthropic (AI 분석)      [키: ANTHROPIC_API_KEY]
브라우저(앱)  ──>  /api/quote  ──> Finnhub(미국) / 야후(한국)  [키: FINNHUB_API_KEY]
```

폴더 구조:

```
valuelens/
├─ index.html                    # 앱의 시작점
├─ package.json                  # 필요한 라이브러리 목록
├─ vite.config.js                # 개발 서버 설정
├─ .env.example                  # 키를 어디 넣는지 보여주는 예시 (실제 키 X)
├─ ValueLens_APEX_recs__3_.jsx   # 내가 만든 원본 화면+로직 (그대로 둠)
├─ src/
│  └─ main.jsx                   # 시작 코드 + 웹앱 적응(저장소·AI우회·실시간가격)
└─ api/
   ├─ ai.js                      # AI 호출 대행 (Anthropic 키 보관)
   └─ quote.js                   # 실시간 시세 대행 (Finnhub/야후)
```

> 💡 원본 `ValueLens_APEX_recs__3_.jsx` 는 한 글자도 고치지 않았어요.
> 웹앱으로 돌아가게 만드는 적응(브라우저 저장소, AI 요청을 `/api/ai` 로 우회,
> 실시간 가격 주입)은 전부 `src/main.jsx` 에서 처리합니다.

---

## 1. 무료 키 2개 발급받기

### (A) Finnhub — 미국 주식 실시간 가격 (무료)
1. https://finnhub.io 접속 → **Sign up** (이메일로 가입)
2. 로그인하면 대시보드에 **API key** 가 보여요. (예: `cXXXXXXXXXXXXXXXX`)
3. 이 값을 복사해 둡니다. → 나중에 `FINNHUB_API_KEY` 에 넣을 값

### (B) Anthropic — AI 분석 (소액 유료, 본인 키)
1. https://console.anthropic.com 접속 → 가입/로그인
2. **Billing** 메뉴에서 결제수단 등록 후 크레딧 충전 (5달러부터 가능, 개인 사용은 분석 1회당 수 원 수준)
3. **API Keys** 메뉴 → **Create Key** → 키 복사 (예: `sk-ant-...`)
4. 이 값을 복사해 둡니다. → 나중에 `ANTHROPIC_API_KEY` 에 넣을 값

> 💡 키는 화면 떠날 때 다시 못 봐요. 안전한 곳에 메모해 두세요.
> 절대 코드 파일이나 깃허브에 직접 적지 마세요. (그래서 `.env` 는 `.gitignore` 로 깃에서 제외돼 있어요.)

---

## 2. Vercel에 배포하기 (가장 쉬운 길)

이 저장소는 이미 깃허브(`kim0916/valuelens`)에 있어요. Vercel이 깃허브를 읽어 자동 배포해요.

1. https://vercel.com 접속 → **Continue with GitHub** 로 가입/로그인
2. **Add New… → Project** 클릭
3. 목록에서 **valuelens** 저장소를 찾아 **Import**
4. 설정 화면에서:
   - **Framework Preset**: `Vite` (자동으로 잡혀요)
   - **Branch**: 처음 배포는 `main` 브랜치를 고르면 돼요
   - 나머지(Build Command, Output 등)는 **그대로 두세요**
5. **Environment Variables** 섹션을 펼쳐 아래 2개를 추가:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | (1-B에서 복사한 `sk-ant-...`) |
   | `FINNHUB_API_KEY` | (1-A에서 복사한 Finnhub 키) |

6. **Deploy** 클릭 → 1~2분 기다리면 `https://valuelens-xxxx.vercel.app` 주소가 나와요. 끝!

> 🔁 이후 깃허브에 코드가 바뀌면 Vercel이 알아서 다시 배포해요.
> 🔑 키를 바꾸거나 추가하면 **Settings → Environment Variables** 에서 수정 후, **Deployments** 탭에서 **Redeploy** 하세요.

---

## 3. (선택) 내 컴퓨터에서 먼저 돌려보기

배포 전에 로컬에서 확인하고 싶으면:

```bash
# 1) 라이브러리 설치 (최초 1회)
npm install

# 2) 키 파일 만들기: .env.example 을 복사해 .env 로 만들고 값 채우기
cp .env.example .env
#   .env 를 열어 ANTHROPIC_API_KEY 와 FINNHUB_API_KEY 를 실제 값으로 채움

# 3) 서버리스 함수까지 함께 띄우기 (Vercel CLI 사용)
npm i -g vercel      # 최초 1회
vercel dev           # http://localhost:3000 으로 앱 + /api 가 함께 실행됨
```

> `npm run dev` 만 쓰면 화면(프론트엔드)은 뜨지만 `/api`(AI·시세)는 동작하지 않아요.
> AI/시세까지 테스트하려면 위처럼 `vercel dev` 를 쓰세요.

---

## 4. 자주 묻는 것

- **AI 버튼을 눌렀는데 에러가 나요** → Vercel 환경변수에 `ANTHROPIC_API_KEY` 가 있는지, 크레딧이 남아있는지 확인하세요.
- **미국 주식 가격이 안 떠요** → `FINNHUB_API_KEY` 확인. 무료 등급은 호출 한도가 있어요(분당 횟수 제한).
- **한국 주식 가격이 가끔 안 떠요** → 야후 비공식 데이터라 가끔 막힐 수 있어요. 잠시 후 다시 시도하거나, 값을 직접 입력하세요.
- **데이터가 저장되나요?** → 종목/설정은 브라우저의 localStorage에 저장돼요. (이 브라우저에만 남고, 기기를 바꾸면 새로 시작)
- **돈이 얼마나 드나요?** → Vercel·Finnhub·야후는 무료 등급으로 충분. Anthropic만 사용한 만큼 소액 과금돼요.
