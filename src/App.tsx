import React, { useEffect, useState } from "react";
import { Dataset } from "./lib/supabase";
import AppInteriorShell from "./components/AppInteriorShell";
import Header from "./components/Header";
import AnnotatorLogin, {
  clearStoredAnnotatorId,
  loadStoredAnnotatorId,
} from "./components/AnnotatorLogin";
import AdminPanel from "./components/AdminPanel";
import DatasetSelector from "./components/DatasetSelector";
import AnnotationPage from "./components/AnnotationPage";
import RatingPage from "./components/RatingPage";
import ModeSelect, { type WorkMode } from "./components/ModeSelect";
import AdminPasswordGate from "./components/AdminPasswordGate";
import { isAdminUnlocked, lockAdmin } from "./lib/adminGate";
import {
  clearIaaPinUnlocks,
  isIaaPinUnlocked,
  resolveIaaCode,
} from "./lib/iaaAnnotators";

type View =
  | "login"
  | "mode"
  | "admin"
  | "selectDataset"
  | "annotate"
  | "rate";

const MODE_STORAGE_KEY = "work_mode";

function loadStoredMode(): WorkMode | null {
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "annotate" || v === "rate") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function saveStoredMode(mode: WorkMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function clearStoredMode() {
  try {
    localStorage.removeItem(MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [view, setView] = useState<View>("login");
  const [annotatorId, setAnnotatorId] = useState("");
  const [mode, setMode] = useState<WorkMode | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminUnlocked);

  useEffect(() => {
    const stored = loadStoredAnnotatorId();
    if (!stored) return;
    const code = resolveIaaCode(stored);
    // Resume session only if PIN was unlocked in this browser tab
    if (code && isIaaPinUnlocked(code)) {
      setAnnotatorId(stored);
      clearStoredMode();
      setMode(null);
      setView("mode");
    }
  }, []);

  // Any interior view requires a PIN-unlocked session
  useEffect(() => {
    if (view === "login" || view === "admin") return;
    if (!annotatorId) {
      setView("login");
      return;
    }
    const code = resolveIaaCode(annotatorId);
    if (!code || !isIaaPinUnlocked(code)) {
      clearStoredMode();
      setMode(null);
      setAnnotatorId("");
      setView("login");
    }
  }, [view, annotatorId]);

  const handleLogout = () => {
    clearStoredAnnotatorId();
    clearStoredMode();
    clearIaaPinUnlocks();
    setAnnotatorId("");
    setMode(null);
    setDataset(null);
    setView("login");
  };

  if (view === "login") {
    return (
      <AnnotatorLogin
        onLogin={(id) => {
          setAnnotatorId(id);
          setMode(null);
          clearStoredMode();
          setView("mode");
        }}
        onAdmin={() => setView("admin")}
      />
    );
  }

  const exitAdmin = () => {
    lockAdmin();
    setAdminUnlocked(false);
    if (!annotatorId) {
      setView("login");
      return;
    }
    if (mode === "rate") setView("rate");
    else if (mode === "annotate") setView("selectDataset");
    else setView("mode");
  };

  if (view === "admin") {
    if (!adminUnlocked) {
      return (
        <AdminPasswordGate
          onUnlocked={() => setAdminUnlocked(true)}
          onCancel={exitAdmin}
        />
      );
    }
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => {}}
          onLogout={exitAdmin}
        />
        <AdminPanel onBack={exitAdmin} backLabel="Logout" />
      </AppInteriorShell>
    );
  }

  if (view === "mode") {
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <ModeSelect
          annotatorId={annotatorId}
          onSelect={(m) => {
            setMode(m);
            saveStoredMode(m);
            setDataset(null);
            // Rating: skip dataset picker — go straight to IAA workspace
            setView(m === "rate" ? "rate" : "selectDataset");
          }}
          onLogout={handleLogout}
        />
      </AppInteriorShell>
    );
  }

  if (view === "selectDataset") {
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <DatasetSelector
          annotatorId={annotatorId}
          mode="annotate"
          onChangeMode={() => {
            setDataset(null);
            clearStoredMode();
            setMode(null);
            setView("mode");
          }}
          onSelect={(d) => {
            setDataset(d);
            setView("annotate");
          }}
        />
      </AppInteriorShell>
    );
  }

  if (view === "rate") {
    const code = resolveIaaCode(annotatorId);
    if (!code) {
      return null;
    }
    return (
      <AppInteriorShell>
        <Header
          // Blind: show code only, never a doctor name in the header
          annotatorId={code}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <RatingPage
          evaluatorId={annotatorId}
          onBack={() => {
            clearStoredMode();
            setMode(null);
            setView("mode");
          }}
        />
      </AppInteriorShell>
    );
  }

  // view === "annotate"
  return (
    <AppInteriorShell>
      <Header
        annotatorId={annotatorId}
        datasetName={dataset?.name}
        onAdmin={() => setView("admin")}
        onLogout={handleLogout}
      />
      {dataset && (
        <AnnotationPage
          dataset={dataset}
          annotatorId={annotatorId}
          onBackToDatasets={() => {
            setDataset(null);
            setView("selectDataset");
          }}
        />
      )}
    </AppInteriorShell>
  );
}
