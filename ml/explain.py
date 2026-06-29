"""Offline SHAP explainability for flagged transactions.

The live dashboard uses the fast deviation-based explainer in ml/scoring.py to
keep per-transaction latency low. This script produces the deeper, audit-grade
explanation using SHAP's TreeExplainer over the Isolation Forest — the kind of
feature attribution you'd hand a compliance team.

Requires the optional `shap` dependency:  pip install shap
Run:  python -m ml.explain
"""
from __future__ import annotations

import numpy as np

from .dataset import FEATURE_COLS, load_dataset
from .scoring import Scorer, normalize_risk, prepare_matrix


def main(max_explain: int = 5) -> None:
    try:
        import shap
    except ImportError:
        raise SystemExit(
            "shap is not installed. Run `pip install shap` to use the offline "
            "explainer. The live dashboard does not require it."
        )

    scorer = Scorer.load()
    df, _ = load_dataset()
    X = df[FEATURE_COLS].to_numpy(dtype=float)
    prepared = prepare_matrix(X, scorer.scaler)

    decision = scorer.model.decision_function(prepared)
    risk = normalize_risk(decision, scorer.min_score, scorer.max_score)
    flagged_idx = np.where(risk >= scorer.flag_threshold)[0]
    if len(flagged_idx) == 0:
        print("No transactions flagged at the current threshold.")
        return

    # Background sample keeps TreeExplainer tractable on large data.
    bg = prepared[np.random.default_rng(42).choice(len(prepared),
                  size=min(200, len(prepared)), replace=False)]
    explainer = shap.TreeExplainer(scorer.model, data=bg)

    print(f"Explaining top {min(max_explain, len(flagged_idx))} flagged transactions:\n")
    for i in flagged_idx[:max_explain]:
        shap_values = explainer.shap_values(prepared[i:i + 1])[0]
        contribs = sorted(zip(FEATURE_COLS, shap_values),
                          key=lambda kv: abs(kv[1]), reverse=True)[:3]
        print(f"txn #{i}  risk={int(risk[i])}  amount=${df.iloc[i]['Amount']:.2f}")
        for feat, val in contribs:
            arrow = "↑ increases risk" if val < 0 else "↓ decreases risk"
            print(f"    {feat:<7} shap={val:+.4f}  {arrow}")
        print()


if __name__ == "__main__":
    main()
