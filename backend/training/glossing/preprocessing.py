import os
from wasabi import msg
import pandas as pd
import spacy
import re
import logging
from pathlib import Path
from spacy.tokens import DocBin
from utils.functions import load_glossing_rules, setup_logging

# Load mapping resources
LEIPZIG_GLOSSARY = load_glossing_rules("LEIPZIG_GLOSSARY.json")
SPACY2CATEGORY = load_glossing_rules("VALUE2FEATURE.json")
LEIPZIG2SPACY = {v: k for k, v in LEIPZIG_GLOSSARY.items()}

script_dir = Path(__file__).parent

logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """
    Clean a glossed string by removing newlines, digits, and punctuation.
    Handles non-str or missing inputs by returning an empty string.
    """
    if not isinstance(text, str):
        return ""
    text = re.sub(r"\d+", "", text)  # remove numbers
    text = re.sub(r"[\[\]\(\)\{\}]", "", text) # remove brackets
    text = text.replace("..", ".") # replace double dots with single dot
    text = text.replace(",", "")  # replace commas with nothing
    text = text.strip().strip('.') # remove dots
    text = text.lower()  # convert to lowercase
    return text.strip() 


def gloss_to_ud_features(gloss: str) -> list[str]:
    if not isinstance(gloss, str):
        return []

    per_token_feats: list[str] = [] # Initialize list to store features for each token
    token_without_gloss: list[str] = [] # Initialize list to store tokens without gloss
    unknown_codes: list[str] = [] # Initialize list to store unknown codes. This means that the code is not in our list of LEIPZIG_GLOSSARY
    for token in gloss.split():
        # Case 1: no “.” ⇒ not glossed because . means that the token has a gloss
        if "." not in token:
            per_token_feats.append('') # Why am I doing this? Check what is the spacy behavior when the token has no gloss
            token_without_gloss.append(token)
            continue

        # Case 2: has gloss, map each code
        codes = [c.upper() for c in token.split(".")[1:]]  # Convert codes to uppercase
        feats: list[str] = []
        for code in codes:
            spacy_value = LEIPZIG2SPACY.get(code)
            feat_name   = SPACY2CATEGORY.get(spacy_value)
            if spacy_value and feat_name:
                feats.append(f"{feat_name}={spacy_value}")
            else:
                unknown_codes.append(code)

        # If no features mapped, use “_” as placeholder
        per_token_feats.append("|".join(feats) if feats else "_")

    logger.debug(f"tokens without gloss: {token_without_gloss}")
    logger.debug(f"unknown codes: {unknown_codes}")

    return per_token_feats


def build_docbin(lang: str, input_dir: str) -> DocBin:
    nlp = spacy.blank(lang)
    docbin = DocBin(attrs=["MORPH"], store_user_data=True)
    all_examples = []

    for root, dirs, files in os.walk(input_dir):
        for fname in files:
            if not fname.endswith("annotated.xlsx"):
                continue

            base = os.path.abspath(os.path.join(root, '..'))
            file_path = os.path.join(root, fname)
            log_path = os.path.join(base, "transcription.log")
            logging_fh = setup_logging(logger, log_path)
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
            

            if len(cleaned_texts) != len(cleaned_glosses):
                raise ValueError(f"Mismatch in lengths: {len(cleaned_texts)} texts vs {len(cleaned_glosses)} glosses in file {file_path}")
            else:
                msg.good(f"Matched {len(cleaned_texts)} texts with {len(cleaned_glosses)} glosses in file {file_path}")
                logger.info(f"Processing {len(cleaned_texts)} texts and glosses from {file_path}")
            
            # Build DataFrame
            inspect_df = pd.DataFrame({
                "cleaned_text": cleaned_texts,
                "cleaned_gloss": cleaned_glosses
            })

            # Save to Excel for full inspection
            inspect_df.to_excel(script_dir / "data" / "cleaned_inspection.xlsx", index=False)

            feats_list = [gloss_to_ud_features(g) for g in cleaned_glosses]

            for text, feats in zip(cleaned_texts, feats_list):
                doc = nlp(text)
                if len(doc) != len(feats):
                    raise ValueError(f"Token count mismatch in row: '{text}' has {len(doc)} tokens but {len(feats)} in file {file_path}")
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