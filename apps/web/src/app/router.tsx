import { Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { Play } from "./routes/Play";
import { Training } from "./routes/Training";
import { Stats } from "./routes/Stats";
import { Settings } from "./routes/Settings";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<Play />} />
      <Route path="/training" element={<Training />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
