"""Dataset loading for VaultScan.

The model is trained on the Kaggle Credit Card Fraud dataset
(https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud). If
``ml/data/creditcard.csv`` is present it is used directly. Otherwise we
synthesize a dataset with the *same schema* (Time, V1..V28, Amount, Class) so
the entire pipeline runs out of the box with zero manual downloads.

The synthetic generator mirrors the real dataset's key properties:
  * V1..V28 are PCA-style components — roughly standard-normal for legit txns.
  * Fraud is rare (~0.17%) and lives in the tails of a handful of components.
  * Amount is heavy-tailed; fraud skews toward unusual amounts.
"""
from __future__ import annotations

import os
from typing import Tuple

import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
REAL_CSV = os.path.join(DATA_DIR, "creditcard.csv")

# Canonical column order — matches the Kaggle CSV exactly.
V_COLS = [f"V{i}" for i in range(1, 29)]
FEATURE_COLS = ["Time", *V_COLS, "Amount"]
ALL_COLS = [*FEATURE_COLS, "Class"]

# Components the synthetic fraud signal is injected into (kept stable so the
# SHAP-style explainer surfaces sensible, repeatable risk flags).
ANOMALY_COMPONENTS = ["V4", "V11", "V14", "V17"]


def is_real_dataset_available() -> bool:
    return os.path.exists(REAL_CSV)


def load_real() -> pd.DataFrame:
    df = pd.read_csv(REAL_CSV)
    missing = [c for c in ALL_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"creditcard.csv is missing columns: {missing}")
    return df[ALL_COLS].copy()


def make_synthetic(n: int = 60_000, fraud_rate: float = 0.0017, seed: int = 42) -> pd.DataFrame:
    """Generate a Kaggle-shaped synthetic fraud dataset."""
    rng = np.random.default_rng(seed)
    n_fraud = max(1, int(round(n * fraud_rate)))
    n_legit = n - n_fraud

    # --- legit transactions: PCA components ~ N(0, 1) ---
    legit = rng.standard_normal((n_legit, 28))
    # Amount: log-normal, most purchases small, long right tail.
    legit_amount = rng.lognormal(mean=3.2, sigma=1.1, size=n_legit)
    # Time: uniform across a ~2 day window (seconds), like the real dataset.
    legit_time = rng.uniform(0, 172_792, size=n_legit)

    # --- fraud transactions: shifted tails on a few components ---
    fraud = rng.standard_normal((n_fraud, 28))
    comp_idx = [int(c[1:]) - 1 for c in ANOMALY_COMPONENTS]
    # A per-fraud sign keeps each transaction internally consistent (the
    # anomaly components move together), producing a clean multivariate signal
    # that sits well outside the legit cloud — separable but not trivially so.
    fraud_sign = rng.choice([-1, 1], size=n_fraud)
    for j in comp_idx:
        shift = rng.uniform(4.5, 7.5, size=n_fraud) * fraud_sign
        fraud[:, j] += shift
    # Fraud amounts skew toward either tiny (card-testing) or large purchases.
    small = rng.lognormal(mean=0.5, sigma=0.6, size=n_fraud)
    large = rng.lognormal(mean=6.0, sigma=0.8, size=n_fraud)
    pick_large = rng.random(n_fraud) < 0.5
    fraud_amount = np.where(pick_large, large, small)
    # Fraud skews to off-hours (early morning seconds in the window).
    fraud_time = rng.uniform(0, 172_792, size=n_fraud)

    legit_df = pd.DataFrame(legit, columns=V_COLS)
    legit_df.insert(0, "Time", legit_time)
    legit_df["Amount"] = np.round(legit_amount, 2)
    legit_df["Class"] = 0

    fraud_df = pd.DataFrame(fraud, columns=V_COLS)
    fraud_df.insert(0, "Time", fraud_time)
    fraud_df["Amount"] = np.round(fraud_amount, 2)
    fraud_df["Class"] = 1

    df = pd.concat([legit_df, fraud_df], ignore_index=True)
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return df[ALL_COLS]


def load_dataset(verbose: bool = True) -> Tuple[pd.DataFrame, str]:
    """Return (dataframe, source) where source is 'real' or 'synthetic'."""
    if is_real_dataset_available():
        if verbose:
            print(f"[dataset] Using real Kaggle dataset at {REAL_CSV}")
        return load_real(), "real"
    if verbose:
        print("[dataset] creditcard.csv not found — generating synthetic dataset "
              "with identical schema. Drop the real CSV in ml/data/ to use it.")
    return make_synthetic(), "synthetic"
