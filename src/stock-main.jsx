// 주식 밸류에이션 앱의 진입점.
// 저장소 루트의 ValueLens_APEX_recs__3_.jsx(내가 만든 도구)를 그대로 화면에 띄운다.
// 부동산 앱(src/main.jsx)은 건드리지 않는다 — 이건 별도 페이지(/stocks.html)다.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../ValueLens_APEX_recs__3_.jsx";

createRoot(document.getElementById("root")).render(<App />);
