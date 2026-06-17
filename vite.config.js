import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 로컬 개발(npm run dev) 중에는 /api 요청을 Vercel CLI(vercel dev, 보통 3000 포트)로 넘긴다.
// 배포된 환경에서는 이 설정과 무관하게 Vercel 이 /api 폴더를 알아서 서버리스 함수로 처리한다.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
