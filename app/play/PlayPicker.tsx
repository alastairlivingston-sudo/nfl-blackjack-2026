"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle, PlayerRow, ScoreMeter, StatePill } from "@/design";
import {
  revealPlayLineup,
  revealPick,
  rollBoard,
  rollTeam,
  rollYear,
  type PlaySlot,
  type RevealState,
  type SeasonPick,
} from "./actions";

type StepStatus = "pending" | "spinning" | "revealed";
type Mode = "hard" | "easy";
interface Pick {
  playerId: string;
  season: number;
  team: string;
  total?: number; // easy mode only, filled after the pick
}

const SPIN_TEAMS = [
  "BUF", "MIA", "NYJ", "NE", "BAL", "CIN", "CLE", "PIT", "HOU", "IND",
  "JAX", "TEN", "DEN", "KC", "LAC", "LV", "DAL", "NYG", "PHI", "WAS",
  "CHI", "DET", "GB", "MIN", "ATL", "CAR", "NO", "TB", "ARI", "LAR", "SF", "SEA",
];

export function PlayPicker({
  seasons,
  initialSeason,
  initialSlots,
}: {
  seasons: number[];
  initialSeason: number;
  initialSlots: PlaySlot[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("hard");
  const [season, setSeason] = useState(initialSeason);
  const [slots, setSlots] = useState<PlaySlot[]>(initialSlots);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<StepStatus>("pending");
  const [spinLabel, setSpinLabel] = useState(SPIN_TEAMS[0]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const [yearUsed, setYearUsed] = useState(false);
  const [teamUsed, setTeamUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RevealState | null>(null);
  const [pending, setPending] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (spinTimer.current) clearInterval(spinTimer.current);
  }, []);

  const current = slots[step];
  const allPicked = slots.length > 0 && slots.every((_, i) => picks[i]);
  const runningTotal = Object.values(picks).reduce((sum, p) => sum + (p.total ?? 0), 0);
  const canYearRespin = mode === "easy" && !yearUsed && seasons.length > 1;
  const canTeamRespin = mode === "easy" && !teamUsed;

  function resetGame(nextSlots: PlaySlot[]) {
    if (spinTimer.current) clearInterval(spinTimer.current);
    setSlots(nextSlots);
    setStep(0);
    setStatus("pending");
    setSpinLabel(SPIN_TEAMS[0]);
    setPicks({});
    setJustPicked(null);
    setYearUsed(false);
    setTeamUsed(false);
    setResult(null);
  }

  async function changeSeason(next: number) {
    setSeason(next);
    setBusy(true);
    const nextSlots = await rollBoard(next);
    resetGame(nextSlots);
    setBusy(false);
  }

  function spin() {
    if (!current) return;
    setStatus("spinning");
    let ticks = 0;
    spinTimer.current = setInterval(() => {
      setSpinLabel(SPIN_TEAMS[Math.floor(Math.random() * SPIN_TEAMS.length)]);
      ticks += 1;
      if (ticks > 10) {
        if (spinTimer.current) clearInterval(spinTimer.current);
        setSpinLabel(current.team);
        setStatus("revealed");
      }
    }, 80);
  }

  async function choose(playerId: string) {
    if (!current) return;
    let total: number | undefined;
    if (mode === "easy") total = await revealPick(current.season, playerId);
    setPicks((prev) => ({ ...prev, [step]: { playerId, season: current.season, team: current.team, total } }));
    setJustPicked(playerId);
    setTimeout(() => {
      setJustPicked(null);
      if (step + 1 < slots.length) {
        setStep((s) => s + 1);
        setStatus("pending");
        setSpinLabel(SPIN_TEAMS[0]);
      }
    }, 450);
  }

  async function respinTeam() {
    if (!current || busy) return;
    setBusy(true);
    const exclude = slots.map((s) => s.team);
    const slot = await rollTeam(current.season, exclude);
    setBusy(false);
    if (!slot) return;
    setTeamUsed(true);
    replaceCurrentSlot(slot);
  }

  async function respinYear() {
    if (!current || busy) return;
    setBusy(true);
    const slot = await rollYear(current.season);
    setBusy(false);
    if (!slot) return;
    setYearUsed(true);
    replaceCurrentSlot(slot);
  }

  function replaceCurrentSlot(slot: PlaySlot) {
    if (spinTimer.current) clearInterval(spinTimer.current);
    setSlots((prev) => prev.map((s, i) => (i === step ? slot : s)));
    setPicks((prev) => {
      const next = { ...prev };
      delete next[step];
      return next;
    });
    setSpinLabel(slot.team);
    setStatus("revealed");
  }

  function playAgain() {
    resetGame(initialSlots);
    setSeason(initialSeason);
    router.refresh();
  }

  async function handleReveal() {
    setResult(null);
    setPending(true);
    const lineup: SeasonPick[] = slots.map((_, i) => ({
      season: picks[i].season,
      playerId: picks[i].playerId,
    }));
    const res = await revealPlayLineup(lineup);
    setResult(res);
    setPending(false);
    if (res.scored?.state === "blackjack") {
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#a78bfa", "#818cf8", "#34d399"] });
      setTimeout(
        () => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors: ["#a78bfa", "#818cf8"] }),
        300,
      );
    }
  }

  if (result?.players && result.scored) {
    return (
      <Card className="animate-pop-in">
        <CardTitle>Reveal</CardTitle>
        <CardSubtitle>Final non-passing TDs.</CardSubtitle>

        <div className="mt-4 space-y-2">
          {result.players.map((p, i) => (
            <div key={p.playerId} className="animate-stagger-in" style={{ animationDelay: `${i * 90}ms` }}>
              <PlayerRow
                name={p.fullName}
                team={`${p.team ?? "FA"} · ${p.season}`}
                position={p.position}
                trailing={<span className="font-semibold">{p.nonPassingTd} TD</span>}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <ScoreMeter total={result.scored.totalTd} state={result.scored.state} />
          <StatePill state={result.scored.state} />
        </div>

        <Button className="mt-4" variant="secondary" onClick={playAgain}>
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Controls
        seasons={seasons}
        season={season}
        mode={mode}
        busy={busy}
        onSeason={changeSeason}
        onMode={(m) => setMode(m)}
      />

      {mode === "easy" && Object.keys(picks).length > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm">
          <span className="text-muted">Running total</span>
          <span className="font-mono font-bold tabular-nums text-foreground">{runningTotal} TD</span>
        </div>
      ) : null}

      <Progress slots={slots} picks={picks} step={step} />

      <Card className="animate-pop-in" key={`${step}-${current?.team}-${current?.season}`}>
        <div className="flex items-center justify-between">
          <CardTitle>
            Team {step + 1} of {slots.length}
          </CardTitle>
          {status !== "pending" ? (
            <span className={status === "spinning" ? "font-mono text-sm font-bold text-violet-300" : "font-mono text-sm font-bold text-foreground"}>
              {status === "revealed" && current ? `${spinLabel} · ${current.season}` : spinLabel}
            </span>
          ) : null}
        </div>

        {status === "pending" ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted">Spin to find out who you&apos;re picking from.</p>
            <Button size="lg" onClick={spin} disabled={busy || !current}>
              🎲 Spin
            </Button>
          </div>
        ) : null}

        {status === "spinning" ? (
          <div className="mt-4 flex items-center justify-center py-10">
            <span className="animate-spin-tilt inline-block font-mono text-2xl font-extrabold tracking-wide text-violet-300">
              {spinLabel}
            </span>
          </div>
        ) : null}

        {status === "revealed" && current ? (
          <div className="mt-3 space-y-2">
            {current.players.map((p, i) => {
              const picked = picks[step]?.playerId === p.id;
              const popping = justPicked === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={justPicked !== null || busy}
                  className="block w-full animate-stagger-in text-left disabled:pointer-events-none"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => choose(p.id)}
                >
                  <PlayerRow
                    name={p.fullName}
                    team={current.team}
                    position={p.position}
                    className={picked ? `border-primary ${popping ? "animate-check-pop" : ""}` : "transition hover:border-primary/60"}
                    trailing={
                      picked ? (
                        <span className="text-primary">
                          {picks[step]?.total !== undefined ? `${picks[step]!.total} TD` : "✓"}
                        </span>
                      ) : undefined
                    }
                  />
                </button>
              );
            })}

            {canTeamRespin || canYearRespin ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {canTeamRespin ? (
                  <Button variant="secondary" onClick={respinTeam} disabled={busy}>
                    ↻ Respin team
                  </Button>
                ) : null}
                {canYearRespin ? (
                  <Button variant="secondary" onClick={respinYear} disabled={busy}>
                    ↻ Respin year
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      {result?.error ? <p className="text-sm text-danger">{result.error}</p> : null}

      {allPicked ? (
        // Sticky so the reveal is in reach the moment the 5th pick lands.
        <div className="sticky bottom-4 z-30">
          <Button
            className="w-full animate-pop-in shadow-lg shadow-black/40"
            size="lg"
            disabled={pending}
            onClick={handleReveal}
          >
            {pending ? "Revealing…" : "Reveal"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Controls({
  seasons,
  season,
  mode,
  busy,
  onSeason,
  onMode,
}: {
  seasons: number[];
  season: number;
  mode: Mode;
  busy: boolean;
  onSeason: (s: number) => void;
  onMode: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {seasons.length > 1 ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          Season
          <select
            value={season}
            disabled={busy}
            onChange={(e) => onSeason(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}

      <div className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5 text-sm">
        {(["hard", "easy"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            className={
              "rounded-lg px-3 py-1 font-semibold capitalize transition-colors " +
              (mode === m ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")
            }
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function Progress({
  slots,
  picks,
  step,
}: {
  slots: PlaySlot[];
  picks: Record<number, Pick>;
  step: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {slots.map((s, i) => {
        const done = Boolean(picks[i]);
        const isCurrent = i === step && !done;
        return (
          <div
            key={`${i}-${s.team}`}
            className={
              "h-1.5 flex-1 rounded-full transition-colors " +
              (done ? "bg-success" : isCurrent ? "bg-primary" : "bg-border")
            }
          />
        );
      })}
    </div>
  );
}
