import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// 로컬 개발(npm run dev) 중에는 /api 요청을 Vercel CLI(vercel dev, 보통 3000 포트)로 넘긴다.
// 배포된 환경에서는 이 설정과 무관하게 Vercel 이 /api 폴더를 알아서 서버리스 함수로 처리한다.
export default defineConfig({
  plugins: [react()],
  // 두 개의 페이지를 함께 빌드한다:
  //  - index.html   -> 부동산 앱  (주소: /)
  //  - stocks.html  -> 주식 앱    (주소: /stocks.html, 또는 /stocks)
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        stocks: resolve(__dirname, "stocks.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
