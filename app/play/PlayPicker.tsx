"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle, PlayerRow, ScoreMeter, StatePill } from "@/design";
import { revealPlayLineup, type RevealState } from "./actions";
import type { BarePlayer } from "@/lib/db/queries";

export interface TeamSlot {
  team: string;
  players: BarePlayer[];
}

type StepStatus = "pending" | "spinning" | "revealed";

const SPIN_TEAMS = [
  "BUF", "MIA", "NYJ", "NE", "BAL", "CIN", "CLE", "PIT", "HOU", "IND",
  "JAX", "TEN", "DEN", "KC", "LAC", "LV", "DAL", "NYG", "PHI", "WAS",
  "CHI", "DET", "GB", "MIN", "ATL", "CAR", "NO", "TB", "ARI", "LAR", "SF", "SEA",
];

export function PlayPicker({ slots }: { slots: TeamSlot[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<StepStatus>("pending");
  const [spinLabel, setSpinLabel] = useState(SPIN_TEAMS[0]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const [result, setResult] = useState<RevealState | null>(null);
  const [pending, setPending] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (spinTimer.current) clearInterval(spinTimer.current);
  }, []);

  const allPicked = slots.every((s) => picks[s.team]);
  const current = slots[step];

  function spin() {
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

  function choose(playerId: string) {
    setPicks((prev) => ({ ...prev, [current.team]: playerId }));
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

  async function handleReveal() {
    setResult(null);
    setPending(true);
    const playerIds = slots.map((s) => picks[s.team]);
    const res = await revealPlayLineup(playerIds);
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
        <CardSubtitle>Final 2025 non-passing TDs.</CardSubtitle>

        <div className="mt-4 space-y-2">
          {result.players.map((p, i) => (
            <div key={p.playerId} className="animate-stagger-in" style={{ animationDelay: `${i * 90}ms` }}>
              <PlayerRow
                name={p.fullName}
                team={p.team ?? "FA"}
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

        <Button className="mt-4" variant="secondary" onClick={() => router.refresh()}>
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Progress slots={slots} picks={picks} step={step} />

      <Card className="animate-pop-in" key={step}>
        <div className="flex items-center justify-between">
          <CardTitle>Team {step + 1} of {slots.length}</CardTitle>
          {status !== "pending" ? (
            <span
              className={status === "spinning" ? "font-mono text-sm font-bold text-violet-300" : "font-mono text-sm font-bold text-foreground"}
            >
              {spinLabel}
            </span>
          ) : null}
        </div>

        {status === "pending" ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted">Spin to find out who you&apos;re picking from.</p>
            <Button size="lg" onClick={spin}>
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

        {status === "revealed" ? (
          <div className="mt-3 space-y-2">
            {current.players.map((p, i) => {
              const picked = picks[current.team] === p.id;
              const popping = justPicked === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={justPicked !== null}
                  className="block w-full animate-stagger-in text-left disabled:pointer-events-none"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => choose(p.id)}
                >
                  <PlayerRow
                    name={p.fullName}
                    team={current.team}
                    position={p.position}
                    className={
                      picked
                        ? `border-primary ${popping ? "animate-check-pop" : ""}`
                        : "transition hover:border-primary/60"
                    }
                    trailing={picked ? <span className="text-primary">✓</span> : undefined}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </Card>

      {result?.error ? <p className="text-sm text-danger">{result.error}</p> : null}

      {allPicked ? (
        <Button className="w-full animate-pop-in" size="lg" disabled={pending} onClick={handleReveal}>
          {pending ? "Revealing…" : "Reveal"}
        </Button>
      ) : null}
    </div>
  );
}

function Progress({
  slots,
  picks,
  step,
}: {
  slots: TeamSlot[];
  picks: Record<string, string>;
  step: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {slots.map((s, i) => {
        const done = Boolean(picks[s.team]);
        const isCurrent = i === step && !done;
        return (
          <div
            key={s.team}
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
