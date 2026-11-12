import { useState } from "react";
import { HomeChooser, type HomeTile } from "./home/HomeChooser";
import { NextScreen } from "./home/NextScreen";
import { ProfileScreen } from "./home/ProfileScreen";
import { readProfileName } from "./home/profile";
import { MatchSetupScreen } from "./match/MatchSetupScreen";
import { createMatch, MatchShell } from "./match/MatchShell";
import { readParkedMatch } from "./match/parkedMatch";
import type { MatchState } from "./match/types";
import { PracticeShell } from "./practice/PracticeShell";

type Screen = "home" | HomeTile | "match";

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [profileName] = useState(() => readProfileName(localStorage));
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [hasParked, setHasParked] = useState(() => readParkedMatch(localStorage) != null);

  function goHome() {
    setScreen("home");
    setHasParked(readParkedMatch(localStorage) != null);
  }

  function openPlay() {
    const parked = readParkedMatch(localStorage);
    if (parked) {
      setMatchState(parked);
      setScreen("match");
      return;
    }
    setScreen("play");
  }

  if (screen === "home") {
    return (
      <HomeChooser
        profileName={profileName}
        onSelect={(tile) => {
          if (tile === "play") openPlay();
          else setScreen(tile);
        }}
      />
    );
  }

  if (screen === "practice") {
    return <PracticeShell onHome={goHome} />;
  }

  if (screen === "play") {
    return (
      <MatchSetupScreen
        profileName={profileName}
        hasParked={hasParked}
        onHome={goHome}
        onResume={() => {
          const parked = readParkedMatch(localStorage);
          if (!parked) return;
          setMatchState(parked);
          setScreen("match");
        }}
        onStart={(setup) => {
          setMatchState(createMatch(setup, profileName));
          setHasParked(false);
          setScreen("match");
        }}
      />
    );
  }

  if (screen === "match" && matchState) {
    return (
      <MatchShell
        key={matchState.youName + ":" + matchState.setup.opponentName + ":" + matchState.setup.starter + ":" + String(matchState.setup.legsBestOf) + ":" + String(hasParked)}
        initial={matchState}
        onHome={goHome}
        onCloseToSetup={() => {
          setMatchState(null);
          setHasParked(false);
          setScreen("play");
        }}
      />
    );
  }

  if (screen === "profile") {
    return <ProfileScreen name={profileName} onHome={goHome} />;
  }

  return (
    <NextScreen
      title="Stats"
      message="Match and Training Game stats are next."
      onHome={goHome}
    />
  );
}
