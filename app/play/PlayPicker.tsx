"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, CardTitle, CardSubtitle, Input, PlayerRow, ScoreMeter, StatePill } from "@/design";
import {
  revealPlayLineup,
  rollRandomBoard,
  rollTeam,
  rollYear,
  submitGeneratorScore,
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
}

const SPIN_TEAMS = [
  "BUF", "MIA", "NYJ", "NE", "BAL", "CIN", "CLE", "PIT", "HOU", "IND",
  "JAX", "TEN", "DEN", "KC", "LAC", "LV", "DAL", "NYG", "PHI", "WAS",
  "CHI", "DET", "GB", "MIN", "ATL", "CAR", "NO", "TB", "ARI", "LAR", "SF", "SEA",
];
const SPIN_YEARS = Array.from({ length: 10 }, (_, i) => 2016 + i);

function slotLabel(team: string, season: number): string {
  return `${team} · ${season}`;
}
function randomSpinLabel(): string {
  return slotLabel(
    SPIN_TEAMS[Math.floor(Math.random() * SPIN_TEAMS.length)],
    SPIN_YEARS[Math.floor(Math.random() * SPIN_YEARS.length)],
  );
}

/** Seconds.milliseconds, e.g. 12.345s (or 1m 05.123s past a minute). */
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(3)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toFixed(3).padStart(6, "0")}s`;
}

export function PlayPicker({ initialSlots, multiSeason }: { initialSlots: PlaySlot[]; multiSeason: boolean }) {
  const [mode, setMode] = useState<Mode>("easy");
  const [started, setStarted] = useState(false); // locks the mode once the first spin happens
  const [slots, setSlots] = useState<PlaySlot[]>(initialSlots);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<StepStatus>("pending");
  const [spinLabel, setSpinLabel] = useState(randomSpinLabel());
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const [yearUsed, setYearUsed] = useState(false);
  const [teamUsed, setTeamUsed] = useState(false);
  const [respinNote, setRespinNote] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RevealState | null>(null);
  const [pending, setPending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => () => {
    if (spinTimer.current) clearInterval(spinTimer.current);
  }, []);

  const current = slots[step];
  const canYearRespin = mode === "easy" && !yearUsed && multiSeason;
  const canTeamRespin = mode === "easy" && !teamUsed;

  function resetGame(nextSlots: PlaySlot[]) {
    if (spinTimer.current) clearInterval(spinTimer.current);
    setSlots(nextSlots);
    setStep(0);
    setStatus("pending");
    setSpinLabel(randomSpinLabel());
    setPicks({});
    setJustPicked(null);
    setYearUsed(false);
    setTeamUsed(false);
    setRespinNote(undefined);
    setResult(null);
    setElapsedMs(0);
    setStarted(false);
    startedAt.current = null;
  }

  function spin(target?: PlaySlot) {
    const slot = target ?? current;
    if (!slot) return;
    // Clock starts on the very first spin of the game, which also locks the mode.
    if (startedAt.current === null) {
      startedAt.current = performance.now(); // eslint-disable-line react-hooks/purity
      setStarted(true);
    }
    setRespinNote(undefined);
    setStatus("spinning");
    let ticks = 0;
    spinTimer.current = setInterval(() => {
      setSpinLabel(randomSpinLabel());
      ticks += 1;
      if (ticks > 10) {
        if (spinTimer.current) clearInterval(spinTimer.current);
        setSpinLabel(slotLabel(slot.team, slot.season));
        setStatus("revealed");
      }
    }, 80);
  }

  function choose(playerId: string) {
    if (!current) return;
    const nextPicks = { ...picks, [step]: { playerId, season: current.season, team: current.team } };
    setPicks(nextPicks);
    setJustPicked(playerId);
    setTimeout(() => {
      setJustPicked(null);
      if (step + 1 < slots.length) {
        const nextStep = step + 1;
        setStep(nextStep);
        spin(slots[nextStep]); // auto-spin the next slot — no manual spin between picks
      } else {
        void reveal(nextPicks); // fifth pick — straight to the results
      }
    }, 450);
  }

  async function reveal(finalPicks: Record<number, Pick>) {
    setPending(true);
    // eslint-disable-next-line react-hooks/purity -- only reached from the pick handler, never render
    const durationMs = startedAt.current !== null ? Math.round(performance.now() - startedAt.current) : 0;
    const lineup: SeasonPick[] = slots.map((_, i) => ({
      season: finalPicks[i].season,
      playerId: finalPicks[i].playerId,
    }));
    const res = await revealPlayLineup(lineup);
    setElapsedMs(durationMs);
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

  async function respinTeam() {
    if (!current || busy) return;
    setBusy(true);
    const slot = await rollTeam(current.season, slots.map((s) => s.team));
    setBusy(false);
    if (!slot) {
      setRespinNote(`No other team available in ${current.season}.`);
      return;
    }
    setTeamUsed(true);
    replaceCurrentSlot(slot);
  }

  async function respinYear() {
    if (!current || busy) return;
    setBusy(true);
    const slot = await rollYear(current.team, current.season);
    setBusy(false);
    if (!slot) {
      setRespinNote(`No other loaded season for ${current.team}.`);
      return;
    }
    setYearUsed(true);
    replaceCurrentSlot(slot);
  }

  function replaceCurrentSlot(slot: PlaySlot) {
    if (spinTimer.current) clearInterval(spinTimer.current);
    setRespinNote(undefined);
    setSlots((prev) => prev.map((s, i) => (i === step ? slot : s)));
    setPicks((prev) => {
      const next = { ...prev };
      delete next[step];
      return next;
    });
    setSpinLabel(slotLabel(slot.team, slot.season));
    setStatus("revealed");
  }

  async function playAgain() {
    setBusy(true);
    const board = await rollRandomBoard();
    resetGame(board);
    setBusy(false);
  }

  if (result?.players && result.scored) {
    return <RevealCard result={result} mode={mode} elapsedMs={elapsedMs} onPlayAgain={playAgain} busy={busy} />;
  }

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} onMode={setMode} locked={started} />
      <Progress slots={slots} picks={picks} step={step} />

      <Card className="animate-pop-in" key={`${step}-${current?.team}-${current?.season}`}>
        <div className="flex items-center justify-between">
          <CardTitle>
            Team {step + 1} of {slots.length}
          </CardTitle>
          {status !== "pending" ? (
            <span className={status === "spinning" ? "font-mono text-sm font-bold text-violet-300" : "font-mono text-sm font-bold text-foreground"}>
              {spinLabel}
            </span>
          ) : null}
        </div>

        {status === "pending" ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted">Spin to draw a random team and year.</p>
            <Button size="lg" onClick={() => spin()} disabled={busy || pending || !current}>
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
            {canTeamRespin || canYearRespin ? (
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                {canTeamRespin ? (
                  <Button variant="secondary" onClick={respinTeam} disabled={busy || pending}>
                    ↻ Respin team
                  </Button>
                ) : null}
                {canYearRespin ? (
                  <Button variant="secondary" onClick={respinYear} disabled={busy || pending}>
                    ↻ Respin year
                  </Button>
                ) : null}
              </div>
            ) : null}
            {respinNote ? <p className="text-sm text-muted">{respinNote}</p> : null}

            {current.players.map((p, i) => {
              const picked = picks[step]?.playerId === p.id;
              const popping = justPicked === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={justPicked !== null || busy || pending}
                  className="block w-full animate-stagger-in text-left disabled:pointer-events-none"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => choose(p.id)}
                >
                  <PlayerRow
                    name={p.fullName}
                    team={current.team}
                    position={p.position}
                    className={picked ? `border-primary ${popping ? "animate-check-pop" : ""}` : "transition hover:border-primary/60"}
                    trailing={picked ? <span className="text-primary">✓</span> : undefined}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </Card>

      {pending ? <p className="text-center text-sm text-muted">Revealing…</p> : null}
      {result?.error ? <p className="text-sm text-danger">{result.error}</p> : null}

      <p className="text-center text-sm">
        <Link href="/play/leaderboard" className="font-semibold text-violet-300 hover:text-white">
          🏆 21 Generator leaderboard
        </Link>
      </p>
    </div>
  );
}

function RevealCard({
  result,
  mode,
  elapsedMs,
  onPlayAgain,
  busy,
}: {
  result: RevealState;
  mode: Mode;
  elapsedMs: number;
  onPlayAgain: () => void;
  busy: boolean;
}) {
  const players = result.players!;
  const scored = result.scored!;
  const isBlackjack = scored.state === "blackjack";

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    const res = await submitGeneratorScore({ name, mode, durationMs: elapsedMs });
    setSubmitting(false);
    if (res.error) setError(res.error);
    else setRank(res.rank ?? null);
  }

  return (
    <Card className="animate-pop-in">
      <CardTitle>Reveal</CardTitle>
      <CardSubtitle>Final non-passing TDs.</CardSubtitle>

      <div className="mt-4 space-y-2">
        {players.map((p, i) => (
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
        <ScoreMeter total={scored.totalTd} state={scored.state} />
        <StatePill state={scored.state} />
      </div>

      {isBlackjack ? (
        <div className="mt-4 rounded-xl border border-success/40 bg-success/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            🎉 Exactly 21 in {formatTime(elapsedMs)} — {mode} mode!
          </p>
          {rank !== null ? (
            <p className="mt-2 text-sm text-muted">
              You&apos;re <span className="font-bold text-foreground">#{rank}</span> on the {mode} board.{" "}
              <Link href="/play/leaderboard" className="font-semibold text-violet-300 hover:text-white">
                See the leaderboard
              </Link>
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted">Add your time to the {mode} leaderboard:</p>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={40}
                  className="flex-1"
                />
                <Button onClick={submit} disabled={submitting || !name.trim()}>
                  {submitting ? "Saving…" : "Add"}
                </Button>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPlayAgain} disabled={busy}>
          Play again
        </Button>
        <Link href="/play/leaderboard">
          <Button variant="secondary">🏆 Leaderboard</Button>
        </Link>
      </div>
    </Card>
  );
}

function ModeToggle({ mode, onMode, locked }: { mode: Mode; onMode: (m: Mode) => void; locked: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">
        {locked
          ? "Mode is locked once you spin."
          : mode === "easy"
            ? "Easy — one team + one year respin."
            : "Hard — no respins."}
      </span>
      <div className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5 text-sm">
        {(["easy", "hard"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={locked}
            onClick={() => onMode(m)}
            className={
              "rounded-lg px-3 py-1 font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
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
