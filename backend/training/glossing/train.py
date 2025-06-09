import random
import tempfile
import os
import pandas as pd
import spacy
import srsly
import re
import string
from pathlib import Path
from spacy.tokens import DocBin
from spacy.training.corpus import Corpus
from spacy.training.initialize import init_nlp
from spacy.training.loop import train as train_nlp
from spacy.util import load_config, get_package_path
from spacy.cli._util import setup_gpu, show_validation_error
from wasabi import msg
from utils.functions import load_glossing_rules

# Load mapping resources
LEIPZIG_GLOSSARY = load_glossing_rules("LEIPZIG_GLOSSARY.json")
VALUE2FEATURE = load_glossing_rules("VALUE2FEATURE.json")
INV_GLOSS = {v: k for k, v in LEIPZIG_GLOSSARY.items()}

script_dir = Path(__file__).parent

# Metrics to collect during evaluation
METRICS = ["token_acc", "pos_acc", "morph_acc", "tag_acc", "dep_uas", "dep_las"]

def clean_text(text: str) -> str:
    """
    Clean a glossed string by removing newlines, digits, and punctuation.
    Handles non-str or missing inputs by returning an empty string.
    """
    if not isinstance(text, str):
        return ""
    text = re.sub(r"\d+", "", text)  # remove numbers
    text = text.replace("..", ".")
    text = re.sub(r"[\[\]\(\)\{\}]", "", text)
    return text.strip()


def gloss_to_ud_features(gloss: str) -> list[str]:
    """
    Convert a glossed string into per-token UD feature strings.
    Handles non-str or missing inputs by returning an empty list.
    E.g., "ART.DEF.M.SG.NOM rabbit.M.SG.NOM" -> ["PronType=Art|Definite=Def|...", "Gender=Masc|..."]
    """
    if not isinstance(gloss, str):
        return []

    not_known_codes: list[str] = []
    not_known_features: list[str] = []
    per_token_feats: list[str] = []
    for token in gloss.split(" "):
        token = token.strip()
        if '.' in token:
            token = token[token.index('.')+1:]  # Remove text before first dot
        if '.' not in token:
            token = "<ignore>"
        feats: list[str] = []
        for code in token.split("."):
            ud_val = INV_GLOSS.get(code)
            if not ud_val:
                not_known_codes.append(code)
            feat_name = VALUE2FEATURE.get(ud_val)
            if not feat_name:
                not_known_features.append(ud_val)
            feats.append(f"{feat_name}={ud_val}")
        per_token_feats.append("|".join(feats))
    if not_known_codes:
        msg.warn(f"Unknown codes in gloss: {not_known_codes}")
    if not_known_features:
        msg.warn(f"Unknown features in gloss: {not_known_features}")
    return per_token_feats


def build_docbin(lang: str, input_dir: str) -> DocBin:
    nlp = spacy.blank(lang)
    docbin = DocBin(attrs=["MORPH"], store_user_data=True)
    all_examples = []

    for root, dirs, files in os.walk(input_dir):
        for fname in files:
            if not fname.endswith("annotated.xlsx"):
                continue
            file_path = os.path.join(root, fname)
            df = pd.read_excel(file_path, nrows=60)
            df = df.dropna(subset=["latin_transcription_utterance_used", "glossing_utterance_used"])

            raw_texts = df["latin_transcription_utterance_used"].astype(str).tolist()
            raw_glosses = df["glossing_utterance_used"].astype(str).tolist()

            cleaned_texts = []
            for t in raw_texts:
                t_clean = clean_text(t)
                lines = [line.strip() for line in t_clean.split("\n") if line.strip()]
                cleaned_texts.extend(lines)

            cleaned_glosses = []
            for g in raw_glosses:
                g_clean = clean_text(g)
                gloss_lines = [line.strip() for line in g_clean.split("\n") if line.strip()]
                cleaned_glosses.extend(gloss_lines)
            

            # Align lengths by minimum (so each row has both text & gloss)
            min_len = min(len(cleaned_texts), len(cleaned_glosses))
            aligned_texts = cleaned_texts[:min_len]
            aligned_glosses = cleaned_glosses[:min_len]

            # Build DataFrame
            inspect_df = pd.DataFrame({
                "cleaned_text": aligned_texts,
                "cleaned_gloss": aligned_glosses
            })

            # Save to Excel for full inspection
            inspect_df.to_excel(script_dir / "data" / "cleaned_inspection.xlsx", index=False)

            if len(cleaned_texts) != len(cleaned_glosses):
                msg.warn(f"Mismatch in lengths: {len(cleaned_texts)} texts vs {len(cleaned_glosses)} glosses in file {file_path}")
                continue

            feats_list = [gloss_to_ud_features(g) for g in cleaned_glosses]

            for text, feats in zip(cleaned_texts, feats_list):
                if not text:
                    msg.warn("Skipping empty text after cleaning")
                    continue
                doc = nlp(text)
                if len(doc) != len(feats):
                    msg.warn(f"Token count mismatch: '{text}' has {len(doc)} tokens but {len(feats)} feature sets: {feats}")
                    continue
                for token, feat in zip(doc, feats):
                    token.set_morph(feat)
                docbin.add(doc)
                all_examples.append({"text": text, "gloss": " ".join(feats)})
    
    # Save examples to Excel
    #if all_examples:
        pd.DataFrame(all_examples).to_excel(script_dir / "data" / "train.xlsx", index=False)

    msg.good(f"Built DocBin with {len(docbin)} documents from {input_dir}")
    print("Total examples:", len(list(docbin.get_docs(nlp.vocab))))
    return docbin

def chunk(items: list, n: int):
    """Split items into n roughly equal chunks."""
    k, m = divmod(len(items), n)
    return [items[i*k + min(i, m):(i+1)*k + min(i+1, m)] for i in range(n)]


def flatten(list_of_lists: list[list]):
    """Flatten one level of nesting."""
    return [x for sub in list_of_lists for x in sub]


def run_training(
    lang: str,
    data_dir: str,
    base_model: str = None,    # e.g. "de_dep_news_trf"
    n_folds: int = 5,
    shuffle: bool = False,
    use_gpu: int = 0,          # 0 for GPU, -1 for CPU
):
    script_dir = Path(__file__).parent
    setup_gpu(use_gpu)

    # 1. Build data & split
    docbin = build_docbin(lang, data_dir)
    docs = list(docbin.get_docs(spacy.blank(lang).vocab))
    if shuffle:
        random.shuffle(docs)
    folds = chunk(docs, n_folds)
    all_scores = {m: [] for m in METRICS}

    for fold_idx, dev_docs in enumerate(folds, start=1):
        train_docs = flatten([f for i,f in enumerate(folds) if i != fold_idx-1])
        msg.divider(f"Fold {fold_idx} — train {len(train_docs)}, dev {len(dev_docs)}")

        with tempfile.TemporaryDirectory() as tmpdir:
            train_path = os.path.join(tmpdir, "train.spacy")
            dev_path   = os.path.join(tmpdir, "dev.spacy")
            DocBin(docs=train_docs).to_disk(train_path)
            DocBin(docs=dev_docs).to_disk(dev_path)

            if base_model:
                msg.info(f"Loading base model: {base_model}")
                nlp_base = spacy.load(base_model)

                # Grab and mutate its in-memory config
                config = nlp_base.config
                config["paths"]["train"] = train_path
                config["paths"]["dev"]   = dev_path
                config["nlp"]["lang"]    = lang
                config["nlp"]["pipeline"] = [
                    "transformer","tagger","parser",
                    "attribute_ruler","lemmatizer","morphologizer"
                ]
                config["training"]["frozen_components"] = [
                    "transformer","tagger","parser",
                    "attribute_ruler","lemmatizer"
                ]

                # Rebuild the pipeline *with* all pretrained weights intact
                nlp = init_nlp(config)

            else:
                # No base model: start from a file-based config as before
                pkg_cfg = script_dir / "config.cfg"
                overrides = {
                    "paths.train": train_path,
                    "paths.dev":   dev_path,
                    "nlp.lang":    lang,
                    "nlp.pipeline": ["tok2vec","morphologizer"],
                    "training.frozen_components": [],
                }
                config = load_config(pkg_cfg, overrides, interpolate=False)
                nlp = init_nlp(config)

            # 4. Train
            with show_validation_error(str(base_model or pkg_cfg), hint_fill=False):
                nlp, _ = train_nlp(nlp, None)

            # 5. Evaluate
            corpus = Corpus(dev_path, gold_preproc=False)
            scores = nlp.evaluate(list(corpus(nlp)))
            for m in METRICS:
                all_scores[m].append(scores.get(m, 0.0))

    # 6. Report & save
    avg = {m: sum(v)/len(v) for m, v in all_scores.items()}
    msg.table(avg, header=("Metric","Score"))
    srsly.write_json(script_dir / "output" / f"results-{lang}.json", avg)

    out_dir = script_dir / "models" / f"{lang}_custom_glossing"
    out_dir.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(out_dir)
    msg.good(f"Saved trained model to {out_dir}")

if __name__ == "__main__":
    run_training(
        lang="de",
        data_dir="path/to/your/annotated/data",
        base_model="de_dep_news_trf",  # or None
        n_folds=5,
        shuffle=True,
        use_gpu=0,                     # 0 for first GPU, -1 for CPU
    )