"""Evaluate the trained Isolation Forest against held-out labels.

Reports precision, recall, F1, ROC-AUC and a confusion matrix. The model is
unsupervised — labels are used *only* here for measurement, never for training.

Run:  python -m ml.evaluate
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
)

from .dataset import FEATURE_COLS, load_dataset
from .scoring import Scorer, normalize_risk, prepare_matrix


def main() -> None:
    scorer = Scorer.load()
    df, source = load_dataset()
    labels = df["Class"].to_numpy()
    X = df[FEATURE_COLS].to_numpy(dtype=float)

    prepared = prepare_matrix(X, scorer.scaler)
    decision = scorer.model.decision_function(prepared)
    risk = normalize_risk(decision, scorer.min_score, scorer.max_score)
    pred = (risk >= scorer.flag_threshold).astype(int)

    print(f"\n=== VaultScan model evaluation (source={source}) ===")
    print(f"transactions: {len(df):,}   actual fraud: {int(labels.sum())}   "
          f"flagged: {int(pred.sum())}\n")

    roc = roc_auc_score(labels, risk / 100.0)
    print(f"ROC-AUC: {roc:.4f}")
    print(classification_report(labels, pred, target_names=["legit", "fraud"],
                                digits=4, zero_division=0))

    tn, fp, fn, tp = confusion_matrix(labels, pred).ravel()
    print("confusion matrix:")
    print(f"            pred_legit  pred_fraud")
    print(f"  legit     {tn:>10}  {fp:>10}")
    print(f"  fraud     {fn:>10}  {tp:>10}")

    # Best-F1 operating point for context.
    precision, recall, thresholds = precision_recall_curve(labels, risk / 100.0)
    f1 = 2 * precision * recall / np.clip(precision + recall, 1e-9, None)
    best = int(np.nanargmax(f1))
    if best < len(thresholds):
        print(f"\nbest-F1 operating point: risk>={thresholds[best] * 100:.1f} "
              f"=> F1={f1[best]:.3f} (precision={precision[best]:.3f}, "
              f"recall={recall[best]:.3f})")


if __name__ == "__main__":
    main()
