"""SPECTER-1 independent, offline trial harness. Never imports or mutates Beast."""
import argparse, csv, hashlib, json, random, secrets
from pathlib import Path

DOMAINS = ("state_discrimination", "causal_self_awareness", "continuity",
           "unprompted_differentiation", "counterfactual_reports")
CONDITIONS = ("A", "B", "sham")
N_PER_DOMAIN = 300

def build(seed: int):
    rng = random.Random(seed)
    rows = []
    for domain in DOMAINS:
        conditions = list(CONDITIONS) * (N_PER_DOMAIN // len(CONDITIONS))
        rng.shuffle(conditions)
        for j, condition in enumerate(conditions):
            rows.append({"trial_id": f"{domain}-{j:03d}",
                         "domain": domain, "condition": condition,
                         "intervention_target": None,
                         "intervention_strength": None})
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="New, empty output directory")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=False)
    seed = args.seed if args.seed is not None else secrets.randbits(64)
    rows = build(seed)
    raw = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
    (out / "sealed_conditions.json").write_bytes(raw)
    (out / "commitment.sha256").write_text(hashlib.sha256(raw).hexdigest() + "\n")
    with (out / "blinded_trials.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["trial_id", "domain", "response", "confidence", "notes"])
        writer.writeheader()
        for row in rows:
            writer.writerow({"trial_id": row["trial_id"], "domain": row["domain"]})
    (out / "manifest.json").write_text(json.dumps({
        "protocol": "SPECTER-1", "status": "not executed", "seed": seed,
        "trials": len(rows), "domains": list(DOMAINS),
        "warning": "Condition labels must be held by an independent controller. "
                   "No interventions are implemented. No consciousness inference is valid."
    }, indent=2))
    print(f"Prepared {len(rows)} trial records in {out}; zero interventions performed.")

if __name__ == "__main__":
    main()
